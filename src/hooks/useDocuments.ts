import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { documentsDb } from "@/integrations/supabase/documents";
import {
  DOCUMENTS_BUCKET,
  MAX_FILE_BYTES,
  safeObjectName,
  type DocumentNode,
} from "@/lib/documents/types";

/**
 * Every row in this student's drive, with the writes that change it.
 *
 * The whole tree is loaded once rather than a folder at a time. A student's
 * drive is tens or hundreds of rows, not thousands, and holding it all means
 * the breadcrumb, the folder picker, the counts and the trash can be derived
 * without a query each — and a move or a rename re-renders every one of them
 * from the same array.
 *
 * Write payloads are cast through `never`, as every Routine hook does. The
 * project compiles with `strict: false`, and Supabase's generated-schema
 * conditional types collapse to `never` under it, so an insert object is
 * rejected field by field however correct it is. The shape is still enforced —
 * by `DocumentNode` at the call sites above, and by the table's own CHECK
 * constraints underneath.
 *
 * Reads are scoped by `user_id` as well as by RLS. The policy is what enforces
 * it; the filter is what makes an accidental cross-user read a visible empty
 * list during development rather than a silent policy denial in production.
 */
export function useDocuments() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNodes([]);
      setLoading(false);
      return;
    }
    const { data, error: readError } = await documentsDb
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (readError) {
      setError(readError.message);
      setLoading(false);
      return;
    }
    setError(null);
    setNodes((data ?? []) as DocumentNode[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  /** Live rows only. The trash is a separate view over the same array. */
  const live = useMemo(() => nodes.filter((n) => n.trashed_at === null), [nodes]);
  const trashed = useMemo(() => nodes.filter((n) => n.trashed_at !== null), [nodes]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  /**
   * The folders from the root down to `id`, for the breadcrumb.
   *
   * Walks up through `parent_id`. The database refuses to create a cycle, but
   * this still counts its hops: a malformed row should render a short trail,
   * never hang the page.
   */
  const pathTo = useCallback(
    (id: string | null): DocumentNode[] => {
      const trail: DocumentNode[] = [];
      let cursor = id;
      let hops = 0;
      while (cursor && hops < 256) {
        const node = byId.get(cursor);
        if (!node) break;
        trail.unshift(node);
        cursor = node.parent_id;
        hops += 1;
      }
      return trail;
    },
    [byId],
  );

  const childrenOf = useCallback(
    (parentId: string | null) => live.filter((n) => n.parent_id === parentId),
    [live],
  );

  /**
   * Every folder below `id`, itself included — what a move has to refuse as a
   * destination. The database blocks the cycle too; this is what greys the
   * option out instead of letting the student pick it and read an error.
   */
  const descendantIds = useCallback(
    (id: string): Set<string> => {
      const out = new Set<string>([id]);
      const queue = [id];
      while (queue.length) {
        const current = queue.shift() as string;
        for (const node of nodes) {
          if (node.parent_id === current && !out.has(node.id)) {
            out.add(node.id);
            queue.push(node.id);
          }
        }
      }
      return out;
    },
    [nodes],
  );

  const createFolder = useCallback(
    async (title: string, parentId: string | null) => {
      if (!user) throw new Error("You need to be signed in.");
      const { data, error: writeError } = await documentsDb
        .from("documents")
        .insert({ user_id: user.id, kind: "folder", title: title.trim(), parent_id: parentId } as never)
        .select("*")
        .single();
      if (writeError) throw new Error(writeError.message);
      const row = data as DocumentNode;
      setNodes((prev) => [row, ...prev]);
      return row;
    },
    [user],
  );

  const createDoc = useCallback(
    async (title: string, parentId: string | null, content = "") => {
      if (!user) throw new Error("You need to be signed in.");
      const { data, error: writeError } = await documentsDb
        .from("documents")
        .insert({
          user_id: user.id,
          kind: "doc",
          title: title.trim(),
          parent_id: parentId,
          content,
        } as never)
        .select("*")
        .single();
      if (writeError) throw new Error(writeError.message);
      const row = data as DocumentNode;
      setNodes((prev) => [row, ...prev]);
      return row;
    },
    [user],
  );

  /**
   * Upload bytes, then record the row.
   *
   * In that order on purpose. A row whose object failed to upload is a file
   * that opens to nothing; an object with no row is invisible and costs a few
   * bytes, so if the second step fails the object is removed again rather than
   * left behind.
   */
  const uploadFile = useCallback(
    async (file: File, parentId: string | null) => {
      if (!user) throw new Error("You need to be signed in.");
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`${file.name} is larger than the 25MB limit.`);
      }
      const path = `${user.id}/${crypto.randomUUID()}-${safeObjectName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error: writeError } = await documentsDb
        .from("documents")
        .insert({
          user_id: user.id,
          kind: "file",
          title: file.name,
          parent_id: parentId,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        } as never)
        .select("*")
        .single();
      if (writeError) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
        throw new Error(writeError.message);
      }
      const row = data as DocumentNode;
      setNodes((prev) => [row, ...prev]);
      return row;
    },
    [user],
  );

  const patch = useCallback(
    async (
      id: string,
      changes: Partial<Pick<DocumentNode, "title" | "content" | "parent_id" | "starred">>,
    ) => {
      if (!user) throw new Error("You need to be signed in.");
      const { data, error: writeError } = await documentsDb
        .from("documents")
        .update(changes as never)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (writeError) throw new Error(writeError.message);
      const row = data as DocumentNode;
      setNodes((prev) => prev.map((n) => (n.id === id ? row : n)));
      return row;
    },
    [user],
  );

  /**
   * Trash and restore.
   *
   * A folder and everything under it move together — the student trashed the
   * folder, so its contents going with it is what they expect, and a child left
   * behind would be unreachable with its parent gone.
   */
  const setTrashed = useCallback(
    async (id: string, trashed: boolean) => {
      if (!user) throw new Error("You need to be signed in.");
      const ids = [...descendantIds(id)];
      const stamp = trashed ? new Date().toISOString() : null;
      const { error: writeError } = await documentsDb
        .from("documents")
        .update({ trashed_at: stamp } as never)
        .in("id", ids)
        .eq("user_id", user.id);
      if (writeError) throw new Error(writeError.message);
      setNodes((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, trashed_at: stamp } : n)));
      return ids.length;
    },
    [user, descendantIds],
  );

  /**
   * Delete for good.
   *
   * The row cascades to its children in the database, so only the top row is
   * deleted here — but every uploaded object underneath has to be removed
   * explicitly, because storage knows nothing about the cascade.
   */
  const purge = useCallback(
    async (id: string) => {
      if (!user) throw new Error("You need to be signed in.");
      const ids = descendantIds(id);
      const paths = nodes
        .filter((n) => ids.has(n.id) && n.file_path)
        .map((n) => n.file_path as string);
      if (paths.length) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
      }
      const { error: writeError } = await documentsDb
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (writeError) throw new Error(writeError.message);
      setNodes((prev) => prev.filter((n) => !ids.has(n.id)));
    },
    [user, nodes, descendantIds],
  );

  return {
    nodes,
    live,
    trashed,
    loading,
    error,
    byId,
    pathTo,
    childrenOf,
    descendantIds,
    refresh,
    createFolder,
    createDoc,
    uploadFile,
    patch,
    setTrashed,
    purge,
  };
}

/** A short-lived URL for an uploaded file. The bucket is private. */
export async function documentSignedUrl(node: DocumentNode): Promise<string | null> {
  if (!node.file_path) return null;
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(node.file_path, 60 * 60);
  return data?.signedUrl ?? null;
}
