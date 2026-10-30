import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { openRepository } from "./repository.js";
import {
  login,
  visibleKnowledge,
  visibleTasks,
  visibleAudit,
  transition,
  createKnowledge,
  createTask,
} from "./core.js";
const staticFiles = new Map([
  [
    "/web/index.html",
    [
      "text/html; charset=utf-8",
      readFileSync(new URL("../web/index.html", import.meta.url)),
    ],
  ],
  [
    "/web/app.js",
    [
      "text/javascript; charset=utf-8",
      readFileSync(new URL("../web/app.js", import.meta.url)),
    ],
  ],
  [
    "/src/core.js",
    [
      "text/javascript; charset=utf-8",
      readFileSync(new URL("./core.js", import.meta.url)),
    ],
  ],
]);
const errors = {
  DEMO_LOGIN_REQUIRED: 401,
  FORBIDDEN: 403,
  FORBIDDEN_TRANSITION: 403,
  KNOWLEDGE_DENIED: 403,
  INVALID_OR_DUPLICATE: 422,
  INVALID_BODY: 422,
  TOO_LARGE: 413,
  INVALID_JSON: 400,
};
async function body(req) {
  let size = 0;
  const parts = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 100000) throw Error("TOO_LARGE");
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    throw Error("INVALID_JSON");
  }
}
function validInput(input, type) {
  if (!input || Array.isArray(input) || typeof input !== "object")
    throw Error("INVALID_BODY");
  const allowed =
    type === "knowledge"
      ? ["id", "title", "body", "visibility"]
      : type === "task"
        ? ["id", "title", "knowledgeIds"]
        : ["to"];
  if (Object.keys(input).some((k) => !allowed.includes(k)))
    throw Error("INVALID_BODY");
  if (type === "transition") {
    if (typeof input.to !== "string") throw Error("INVALID_BODY");
    return;
  }
  if (
    typeof input.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(input.id) ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 200
  )
    throw Error("INVALID_BODY");
  if (
    type === "task" &&
    (!Array.isArray(input.knowledgeIds) ||
      input.knowledgeIds.length > 100 ||
      input.knowledgeIds.some((id) => typeof id !== "string"))
  )
    throw Error("INVALID_BODY");
  if (
    type === "knowledge" &&
    (typeof (input.body ?? "") !== "string" ||
      (input.body ?? "").length > 20000 ||
      !["private", "shared"].includes(input.visibility))
  )
    throw Error("INVALID_BODY");
}
export function createAppServer({
  repository = openRepository(process.env.DEMO_DB ?? "data/live.json"),
} = {}) {
  const server = createHttpServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, value) => {
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      if (req.url === "/" && req.method === "GET") {
        res.writeHead(302, { location: "/web/index.html" });
        res.end();
        return;
      }
      const file = staticFiles.get(req.url);
      if (file && req.method === "GET") {
        res.writeHead(200, { "content-type": file[0] });
        res.end(file[1]);
        return;
      }
      if (!req.url?.startsWith("/api/")) {
        send(404, { error: "NOT_FOUND", request_id: requestId });
        return;
      }
      const actor = login(
        String(req.headers["x-demo-user"] ?? ""),
        String(req.headers["x-demo-password"] ?? ""),
      );
      if (!actor) throw Error("DEMO_LOGIN_REQUIRED");
      if (req.url === "/api/overview" && req.method === "GET") {
        const db = repository.snapshot();
        send(200, {
          actor,
          knowledge: visibleKnowledge(db, actor),
          tasks: visibleTasks(db, actor),
          audit: visibleAudit(db, actor),
        });
        return;
      }
      const type =
        req.url === "/api/knowledge"
          ? "knowledge"
          : req.url === "/api/tasks"
            ? "task"
            : /^\/api\/tasks\/[a-zA-Z0-9_-]{1,80}$/.test(req.url)
              ? "transition"
              : null;
      if (req.method !== "POST" || !type) {
        send(404, { error: "NOT_FOUND", request_id: requestId });
        return;
      }
      const input = await body(req);
      validInput(input, type);
      const result = repository.transaction((db) =>
        type === "knowledge"
          ? createKnowledge(db, actor, input)
          : type === "task"
            ? createTask(db, actor, input)
            : transition(db, actor, req.url.split("/")[3], input.to),
      );
      send(200, result);
    } catch (error) {
      const code = errors[error.message] ?? 500;
      if (code === 413) { req.resume(); res.setHeader("Connection", "close"); }
      send(code, {
        error: code === 500 ? "PERSISTENCE_OR_INTERNAL_ERROR" : error.message,
        request_id: requestId,
      });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT ?? 8788);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw Error("INVALID_PORT");
  const server = createAppServer();
  server.listen(port, "127.0.0.1", () =>
    console.log(
      JSON.stringify({
        event: "listening",
        host: "127.0.0.1",
        port: server.address().port,
        scope: "synthetic_demo",
      }),
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => server.close(() => process.exit(0)));
}
