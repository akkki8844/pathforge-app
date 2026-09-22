/**
 * Pathforge Documents: the student's own drive.
 *
 * One row type covers the whole tree. A `folder` holds things, a `doc` is
 * written in Pathforge and holds markdown, and a `file` is something uploaded
 * whose bytes live in the `user-documents` bucket. `parent_id` is the folder a
 * row sits in, or null at the root.
 *
 * This is not the Google Docs connector. That connector reaches into documents
 * that live in a Google account and Pathforge keeps no copy of them; these rows
 * are Pathforge's own, and nothing here leaves the database.
 */

export type DocumentKind = "folder" | "doc" | "file";

export interface DocumentNode {
  id: string;
  user_id: string;
  /** The folder this sits in. Null is the root of the drive. */
  parent_id: string | null;
  kind: DocumentKind;
  title: string;
  /** Markdown body. Only a `doc` has one. */
  content: string | null;
  /** Storage object path, `<user_id>/<uuid>-<name>`. Only a `file` has one. */
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  starred: boolean;
  /** Set when the row is in the trash; null while it is live. */
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The bucket uploaded files live in. Private; read through signed URLs. */
export const DOCUMENTS_BUCKET = "user-documents";

/** Matches the bucket's `file_size_limit`, so the UI can refuse before the upload. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Folders first, then by name — the order a drive lists things in. */
export function compareNodes(a: DocumentNode, b: DocumentNode): number {
  if (a.kind === "folder" && b.kind !== "folder") return -1;
  if (b.kind === "folder" && a.kind !== "folder") return 1;
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

/** "2.4 MB". Bytes are what the database stores; this is for reading. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/**
 * A name that will survive the round trip to storage.
 *
 * The object path is `<user_id>/<uuid>-<name>`, and Supabase rejects keys with
 * characters outside a conservative set. The uuid already makes the key unique,
 * so this only has to keep the name readable.
 */
export function safeObjectName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
  return cleaned.slice(0, 120) || "file";
}
