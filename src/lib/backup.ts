import { normalise } from "./backend";
import type { DB } from "./types";

export interface BackupFile {
  app: "casa-a-dois";
  version: 1;
  exportedAt: string;
  db: DB;
}

export function toBackup(db: DB): string {
  const f: BackupFile = { app: "casa-a-dois", version: 1, exportedAt: new Date().toISOString(), db };
  return JSON.stringify(f, null, 2);
}

export function fromBackup(text: string): DB {
  const raw = JSON.parse(text);
  if (!raw || raw.app !== "casa-a-dois" || !raw.db) throw new Error("Este ficheiro não é uma cópia da Casa a Dois.");
  const db = normalise(raw.db);
  if (!db.member.length) throw new Error("O ficheiro não tem pessoas configuradas.");
  return db;
}

export function downloadText(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
