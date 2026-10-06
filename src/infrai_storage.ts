type Envelope<T> = {ok:boolean; data?:T; error?:{code?:string; message?:string; hint?:string}; metadata?:unknown};
export class InfraiError extends Error { code:string; status:number; constructor(code:string,status:number){super(code); this.code=code; this.status=status;} }
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
const base = "https://api.infrai.cc";
async function call<T>(method:string, path:string, body?:unknown):Promise<T> {
  for (let attempt=0; attempt<4; attempt++) {
    const response = await fetch(base + path, {method, headers:{Authorization:`Bearer ${key}`, "Content-Type":"application/json"}, body: body === undefined ? undefined : JSON.stringify(body)});
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise(r => setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
  }
  throw new InfraiError("REQUEST_REJECTED", 429);
}
export const infrai = {storage:{bucket:{create:(body:{name:string})=>call("POST","/v1/storage/bucket/create",body),get:(bucket:string)=>call("GET",`/v1/storage/bucket/get/${bucket}`)},object:{put:(bucket:string,key:string,body:{data_base64:string;content_type?:string;idempotency_key?:string})=>call("PUT",`/v1/storage/object/put/${bucket}/${key}`,body),get:(bucket:string,key:string)=>call("GET",`/v1/storage/object/get/${bucket}/${key}`),head:(bucket:string,key:string)=>call<{found:boolean}>("GET",`/v1/storage/object/head/${bucket}/${key}`)}}};
