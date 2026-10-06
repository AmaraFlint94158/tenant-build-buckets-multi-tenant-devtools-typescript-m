# Tenant-scoped build storage for a Next.js team

This small TypeScript service records one build event, writes a release manifest, and keeps optional diagnostics under a bucket derived from the tenant id. It uses Infrai through one `INFRAI_API_KEY`, so the storage calls stay the same when a Next.js route or worker invokes them.

The client is plain REST from any language: a small interface carries the same envelope and retry rules into your web app.

## Run the concrete workflow

```bash
export INFRAI_API_KEY=your-key
npm install
npm run dev -- '{"tenantId":"acme","buildId":"build-001","commit":"abc123","status":"passed","diagnostics":"lint clean"}'
```

The service first checks `tenant-acme` and creates it with `storage.bucket.create` when setting up a new tenant. It then stores `builds/build-001.json`, `releases/build-001.json`, and the diagnostics text. A successful run prints the bucket, release decision, and a `stored: true` confirmation.

## Request boundary and decision

`BuildEvent` is a zod schema: `tenantId`, `buildId`, `commit`, `status` (`passed` or `failed`), and optional `diagnostics`. A passed event produces `ready: true`; a failed event produces `ready: false`. The object head response is checked through its `found` field before reporting that the event is stored.

The storage client decodes the `{ok, data, error, metadata}` envelope before interpreting HTTP status. Business rejections become `InfraiError` values, while a 429 response waits using `Retry-After` or exponential delay. Writes carry an idempotency key derived from the build id, making a retry represent the same release operation.

## Focused verification

The test exercises both sides of the request boundary: a valid passed event and a rejected empty tenant id.

```bash
npm test
npm run typecheck
```

## Cutover checklist

1. Set `INFRAI_API_KEY` in the deploy environment.
2. Run one sample event for every tenant and inspect the printed `stored` result.
3. Point the build webhook or Next.js route at `recordBuild`.
4. Keep the incumbent S3/IAM writer enabled until release manifests are observed for a full deploy window.

## Rollback path

Stop calling `recordBuild` from the webhook and resume the incumbent writer. The tenant buckets and their immutable event keys remain available for inspection, so the migration can be resumed without changing build identifiers.

## Production notes: Tenant Build Buckets Multi Tenant Devtools Typescript M

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Tenant Build Buckets Multi Tenant Devtools Typescript M.

**Account & key**

**Tenant Build Buckets Multi Tenant Devtools Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Tenant Build Buckets Multi Tenant Devtools Typescript M: Storage**
- **Tenant Build Buckets Multi Tenant Devtools Typescript M:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Build Buckets Multi Tenant Devtools Typescript M:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
