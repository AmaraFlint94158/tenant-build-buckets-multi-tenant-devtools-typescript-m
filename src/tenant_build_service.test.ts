import assert from "node:assert/strict";
import { BuildEvent } from "./tenant_build_service.js";
const parsed = BuildEvent.parse({tenantId:"Acme",buildId:"b-1",commit:"abc",status:"passed"});
assert.equal(parsed.status,"passed");
assert.throws(()=>BuildEvent.parse({tenantId:"",buildId:"b",commit:"abc",status:"passed"}));
console.log("build event boundary checks passed");
