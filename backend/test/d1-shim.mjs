// Nachbildung der Cloudflare-D1-Schnittstelle mit SQLite – nur für lokale Tests.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export function createD1(schemaPath) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(schemaPath, "utf8"));
  return {
    _db: db,
    prepare(sql) {
      const stmt = db.prepare(sql);
      let args = [];
      const api = {
        bind(...a) { args = a; return api; },
        async first() { return stmt.get(...args) ?? null; },
        async all()   { return { results: stmt.all(...args) }; },
        async run()   { const r = stmt.run(...args); return { meta: { changes: Number(r.changes) } }; },
      };
      return api;
    },
  };
}
