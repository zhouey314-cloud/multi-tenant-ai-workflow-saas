import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../src/server.ts";
import { openRepository } from "../src/repository.js";
const headers = {
  "x-demo-user": "store@example.com",
  "x-demo-password": "demo-store-only",
  "content-type": "application/json",
};
async function withServer(repository, fn) {
  const s = createAppServer({ repository });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  try {
    await fn("http://127.0.0.1:" + s.address().port);
  } finally {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
}
function scratch(t) {
  const p = mkdtempSync(join(tmpdir(), "workflow-api-"));
  t.after(() => rmSync(p, { recursive: true, force: true }));
  return join(p, "snapshot.json");
}
test("write failure rolls back memory and audit as well as durable state", async (t) => {
  const file = scratch(t),
    repository = openRepository(file, {
      persist: () => {
        throw Error("injected disk failure");
      },
    });
  const before = repository.snapshot();
  await withServer(repository, async (base) => {
    const r = await fetch(base + "/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: "new-task",
        title: "Fixture",
        knowledgeIds: ["k-hq"],
      }),
    });
    assert.equal(r.status, 500);
    const error = await r.json();
    assert.equal(error.request_id, r.headers.get("x-request-id"));
    assert(!JSON.stringify(error).includes("injected disk"));
    const overview = await (
      await fetch(base + "/api/overview", { headers })
    ).json();
    assert(!overview.tasks.some((t) => t.id === "new-task"));
  });
  assert.deepEqual(repository.snapshot(), before);
});
test("real HTTP commits survive restart and preserve tenant boundaries", async (t) => {
  const file = scratch(t);
  await withServer(openRepository(file), async (base) => {
    const r = await fetch(base + "/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: "persisted",
        title: "Fixture",
        knowledgeIds: ["k-hq"],
      }),
    });
    assert.equal(r.status, 200);
  });
  const saved = JSON.parse(readFileSync(file, "utf8"));
  assert(saved.tasks.some((t) => t.id === "persisted"));
  await withServer(openRepository(file), async (base) => {
    const r = await fetch(base + "/api/overview", { headers });
    const value = await r.json();
    assert(value.tasks.some((t) => t.id === "persisted"));
    assert(!value.knowledge.some((k) => k.tenant === "other"));
    assert.equal(value.audit.length, 1);
  });
});
test("bad credentials, schemas, forbidden evidence and unknown routes fail closed", async (t) => {
  await withServer(openRepository(scratch(t)), async (base) => {
    const oversized = await fetch(base + "/api/tasks", {method:"POST",headers,body:"x".repeat(100001)});
    assert.equal(oversized.status,413);

    assert.equal((await fetch(base + "/api/overview")).status, 401);
    for (const [input, status] of [
      [null, 422],
      [{ id: "x", title: "X" }, 422],
      [{ id: "x", title: "X", knowledgeIds: ["k-other"] }, 403],
      [{ id: "x", title: "X", knowledgeIds: [], tenant: "other" }, 422],
    ]) {
      const r = await fetch(base + "/api/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
      assert.equal(r.status, status);
    }
    assert.equal(
      (
        await fetch(base + "/api/tasks/x/extra", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      404,
    );
  });
});
