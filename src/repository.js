// One server process owns this JSON snapshot. Transactions publish memory only
// after a private, fsynced temporary file has replaced the durable snapshot.
import {
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
  lstatSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { seed } from "./core.js";
export function openRepository(filename, { persist } = {}) {
  const path = resolve(filename);
  let state = seed();
  if (existsSync(path)) {
    if (lstatSync(path).isSymbolicLink()) throw Error("UNSAFE_SNAPSHOT");
    state = JSON.parse(readFileSync(path, "utf8"));
  }
  if (
    !state ||
    typeof state.units !== "object" ||
    !Array.isArray(state.knowledge) ||
    !Array.isArray(state.tasks) ||
    !Array.isArray(state.audit)
  )
    throw Error("INVALID_SNAPSHOT");
  const save =
    persist ??
    ((candidate) => {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      const temporary = path + "." + randomUUID() + ".tmp";
      let fd;
      try {
        fd = openSync(temporary, "wx", 0o600);
        writeFileSync(fd, JSON.stringify(candidate, null, 2));
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        renameSync(temporary, path);
      } finally {
        if (fd !== undefined) closeSync(fd);
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    });
  return {
    snapshot: () => structuredClone(state),
    transaction: (operation) => {
      const next = structuredClone(state),
        result = operation(next);
      save(next);
      state = next;
      return structuredClone(result);
    },
  };
}
