import { z } from "zod";
import { infrai, InfraiError } from "./infrai_storage.js";

export const BuildEvent = z.object({tenantId:z.string().min(1), buildId:z.string().min(1), commit:z.string().min(1), status:z.enum(["passed","failed"]), diagnostics:z.string().default("")});
export type BuildEvent = z.infer<typeof BuildEvent>;
const bucketFor = (tenantId:string) => `tenant-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g,"-")}`;
const encoded = (value:unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
async function ensureBucket(bucket:string) { try { await infrai.storage.bucket.get(bucket); } catch (error) { if (error instanceof InfraiError && error.status < 500) await infrai.storage.bucket.create({name:bucket}); else throw error; } }
export async function recordBuild(input:unknown) {
  const event = BuildEvent.parse(input); const bucket = bucketFor(event.tenantId); await ensureBucket(bucket);
  const eventKey = `builds/${event.buildId}.json`; await infrai.storage.object.put(bucket,eventKey,{data_base64:encoded(event),content_type:"application/json",idempotency_key:event.buildId});
  const releaseKey = `releases/${event.buildId}.json`;
  const release = {tenantId:event.tenantId,buildId:event.buildId,commit:event.commit,ready:event.status === "passed"};
  await infrai.storage.object.put(bucket,releaseKey,{data_base64:encoded(release),content_type:"application/json",idempotency_key:`release-${event.buildId}`});
  if (event.diagnostics) await infrai.storage.object.put(bucket,`diagnostics/${event.buildId}.txt`,{data_base64:Buffer.from(event.diagnostics).toString("base64"),content_type:"text/plain",idempotency_key:`diag-${event.buildId}`});
  const head = await infrai.storage.object.head(bucket,eventKey); return {bucket,eventKey,release,stored:head.found};
}
if (process.argv[1]?.endsWith("tenant_build_service.ts")) {
  const body = process.argv[2] ? JSON.parse(process.argv[2]) : {tenantId:"acme",buildId:"build-001",commit:"abc123",status:"passed",diagnostics:""};
  recordBuild(body).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error); process.exitCode=1;});
}
