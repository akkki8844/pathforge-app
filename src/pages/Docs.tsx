import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Download,
  FileText,
  FilePlus2,
  Folder,
  FolderPlus,
  Home,
  MoreVertical,
  Paperclip,
  Pencil,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { documentSignedUrl, useDocuments } from "@/hooks/useDocuments";
import { FilePreview } from "@/components/docs/FilePreview";
import { compareNodes, formatBytes, type DocumentNode } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

/**
 * Documents — the student's own drive, inside Pathforge.
 *
 * Folders, documents written here, and files uploaded here. Nothing on this
 * page touches Google Docs or any other outside service: every row is a row in
 * `public.documents` and every uploaded byte is in the private `user-documents`
 * bucket, readable only through a signed URL by the account that owns it.
 *
 * The current folder lives in the URL (`?folder=`), so a folder can be linked,
 * bookmarked and reached with the back button rather than only by clicking down
 * from the root.
 */

type Shelf = "drive" | "starred" | "trash";

function KindIcon({ node, className }: { node: DocumentNode; className?: string }) {
  if (node.kind === "folder") return <Folder className={cn("text-primary", className)} />;
  if (node.kind === "file") return <Paperclip className={cn("text-muted-foreground", className)} />;
  return <FileText className={cn("text-muted-foreground", className)} />;
}

/** "Edited 3 Sep" / "Edited today". Short, because the row is already narrow. */
function editedLabel(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) {
    return `Edited ${then.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const sameYear = then.getFullYear() === now.getFullYear();
  return `Edited ${then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })}`;
}

export default function Docs() {
  const {
    live,
    trashed,
    loading,
    error,
    pathTo,
    childrenOf,
    descendantIds,
    createFolder,
    createDoc,
    uploadFile,
    patch,
    setTrashed,
    purge,
  } = useDocuments();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const shelf = (params.get("shelf") as Shelf) ?? "drive";
  const folderId = params.get("folder");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<DocumentNode | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [renaming, setRenaming] = useState<DocumentNode | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moving, setMoving] = useState<DocumentNode | null>(null);
  const [deleting, setDeleting] = useState<DocumentNode | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const trail = useMemo(() => pathTo(folderId), [pathTo, folderId]);

  /**
   * What the current shelf shows.
   *
   * The drive shows one folder at a time. Starred and Trash are flat: they are
   * lists of things you are looking for, and making you walk a tree to find a
   * thing you starred would defeat starring it.
   */
  const rows = useMemo(() => {
    const source =
      shelf === "trash" ? trashed : shelf === "starred" ? live.filter((n) => n.starred) : childrenOf(folderId);
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? (shelf === "drive" ? live : source).filter((n) => n.title.toLowerCase().includes(needle))
      : source;
    return [...matched].sort(compareNodes);
  }, [shelf, trashed, live, childrenOf, folderId, query]);

  const setShelf = useCallback(
    (next: Shelf) => {
      const updated = new URLSearchParams(params);
      updated.set("shelf", next);
      updated.delete("folder");
      setParams(updated, { replace: false });
    },
    [params, setParams],
  );

  const openFolder = useCallback(
    (id: string | null) => {
      const updated = new URLSearchParams();
      if (id) updated.set("folder", id);
      setParams(updated, { replace: false });
    },
    [setParams],
  );

  const open = useCallback(
    async (node: DocumentNode) => {
      if (node.trashed_at) {
        toast({
          title: "This is in the trash",
          description: "Put it back first, then open it.",
        });
        return;
      }
      if (node.kind === "folder") {
        openFolder(node.id);
        return;
      }
      if (node.kind === "doc") {
        navigate(`/docs/d/${node.id}`);
        return;
      }
      // Uploaded files open over the drive rather than in a new tab. The
      // common question about a file here is "is this the right one", which is
      // four seconds of looking followed by closing it — and a new tab makes
      // that cost a lost place in the folder. FilePreview still offers the tab
      // and the download for the cases that want them.
      setPreviewing(node);
    },
    [navigate, openFolder, toast],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return;
      setUploading(true);
      let saved = 0;
      for (const file of Array.from(files)) {
        try {
          await uploadFile(file, folderId);
          saved += 1;
        } catch (cause) {
          toast({
            title: `Could not upload ${file.name}`,
            description: cause instanceof Error ? cause.message : undefined,
            variant: "destructive",
          });
        }
      }
      setUploading(false);
      if (saved) {
        toast({ title: saved === 1 ? "File uploaded" : `${saved} files uploaded` });
      }
    },
    [uploadFile, folderId, toast],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (shelf !== "drive") return;
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles, shelf],
  );

  const newDocument = useCallback(async () => {
    try {
      const row = await createDoc("Untitled document", folderId);
      navigate(`/docs/d/${row.id}`);
    } catch (cause) {
      toast({
        title: "Could not create that document",
        description: cause instanceof Error ? cause.message : undefined,
        variant: "destructive",
      });
    }
  }, [createDoc, folderId, navigate, toast]);

  const submitNewFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(name, folderId);
      setNewFolderOpen(false);
      setNewFolderName("");
    } catch (cause) {
      toast({
        title: "Could not create that folder",
        description: cause instanceof Error ? cause.message : undefined,
        variant: "destructive",
      });
    }
  }, [createFolder, newFolderName, folderId, toast]);

  const submitRename = useCallback(async () => {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name || name === renaming.title) {
      setRenaming(null);
      return;
    }
    try {
      await patch(renaming.id, { title: name });
      setRenaming(null);
    } catch (cause) {
      toast({
        title: "Could not rename that",
        description: cause instanceof Error ? cause.message : undefined,
        variant: "destructive",
      });
    }
  }, [renaming, renameValue, patch, toast]);

  /** Folders this row may be moved into: every folder except itself and its own. */
  const moveTargets = useMemo(() => {
    if (!moving) return [];
    const blocked = descendantIds(moving.id);
    return live
      .filter((n) => n.kind === "folder" && !blocked.has(n.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [moving, descendantIds, live]);

  const submitMove = useCallback(
    async (target: string | null) => {
      if (!moving) return;
      try {
        await patch(moving.id, { parent_id: target });
        setMoving(null);
      } catch (cause) {
        toast({
          title: "Could not move that",
          description: cause instanceof Error ? cause.message : undefined,
          variant: "destructive",
        });
      }
    },
    [moving, patch, toast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await purge(deleting.id);
      setDeleting(null);
      toast({ title: "Deleted for good" });
    } catch (cause) {
      toast({
        title: "Could not delete that",
        description: cause instanceof Error ? cause.message : undefined,
        variant: "destructive",
      });
    }
  }, [deleting, purge, toast]);

  const toTrash = useCallback(
    async (node: DocumentNode) => {
      try {
        const count = await setTrashed(node.id, true);
        toast({
          title: "Moved to trash",
          description:
            count > 1 ? `${node.title} and ${count - 1} thing${count > 2 ? "s" : ""} inside it.` : node.title,
        });
      } catch (cause) {
        toast({
          title: "Could not move that to the trash",
          description: cause instanceof Error ? cause.message : undefined,
          variant: "destructive",
        });
      }
    },
    [setTrashed, toast],
  );

  const counts = useMemo(
    () => ({
      docs: live.filter((n) => n.kind === "doc").length,
      files: live.filter((n) => n.kind === "file").length,
      folders: live.filter((n) => n.kind === "folder").length,
    }),
    [live],
  );

  return (
    <div
      className="min-h-svh bg-background"
      onDragOver={(event) => {
        if (shelf !== "drive") return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Seo
        title="Documents"
        description="Your own drive inside Pathforge — write documents, upload files and keep them in folders."
        path="/docs"
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your drive inside Pathforge. Write documents here, upload files, keep them in folders.
            {counts.docs + counts.files + counts.folders > 0 && (
              <>
                {" "}
                {counts.folders} folder{counts.folders === 1 ? "" : "s"}, {counts.docs} document
                {counts.docs === 1 ? "" : "s"}, {counts.files} file{counts.files === 1 ? "" : "s"}.
              </>
            )}
          </p>
        </header>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-background p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: "drive", label: "Drive", Icon: Folder },
                { id: "starred", label: "Starred", Icon: Star },
                { id: "trash", label: "Trash", Icon: Trash2 },
              ] as const
            ).map(({ id, label, Icon }) => (
              <Button
                key={id}
                variant={shelf === id ? "default" : "ghost"}
                size="sm"
                className="h-8 shrink-0"
                onClick={() => setShelf(id)}
              >
                <Icon className="h-4 w-4" />
                <span className="ml-1">{label}</span>
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your documents…"
                className="pl-9"
                aria-label="Search documents"
              />
            </div>
            {shelf === "drive" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">New folder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">{uploading ? "Uploading…" : "Upload"}</span>
                </Button>
                <Button size="sm" onClick={newDocument}>
                  <FilePlus2 className="h-4 w-4" />
                  <span className="ml-1">New document</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {shelf === "drive" && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => openFolder(null)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted",
                !folderId && "font-medium text-foreground",
                folderId && "text-muted-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5" />
              Documents
            </button>
            {trail.map((node, index) => (
              <span key={node.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  onClick={() => openFolder(node.id)}
                  className={cn(
                    "rounded-md px-2 py-1 hover:bg-muted",
                    index === trail.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {node.title}
                </button>
              </span>
            ))}
          </nav>
        )}

        {dragging && shelf === "drive" && (
          <div className="mb-3 rounded-xl border-2 border-dashed border-primary bg-primary/5 p-6 text-center text-sm font-medium text-primary">
            Drop to upload into {trail.length ? trail[trail.length - 1].title : "Documents"}
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {query.trim()
                ? "Nothing matches that."
                : shelf === "trash"
                  ? "The trash is empty."
                  : shelf === "starred"
                    ? "Nothing starred yet."
                    : trail.length
                      ? "This folder is empty."
                      : "Nothing here yet."}
            </p>
            {!query.trim() && shelf === "drive" && (
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Write a document, or drag a file anywhere on this page to upload it. Everything you
                keep here stays in Pathforge.
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {rows.map((node) => (
              <li key={node.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => void open(node)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <KindIcon node={node} className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-foreground">
                        {node.title}
                      </span>
                      {node.starred && !node.trashed_at && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                      {node.kind === "folder" ? (
                        <>{childrenOf(node.id).length} item{childrenOf(node.id).length === 1 ? "" : "s"}</>
                      ) : node.kind === "file" ? (
                        <>{formatBytes(node.file_size)}</>
                      ) : (
                        <>Document</>
                      )}
                      <span aria-hidden>·</span>
                      {editedLabel(node.updated_at)}
                    </span>
                  </span>
                </button>

                {shelf === "trash" ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void setTrashed(node.id, false)}
                      className="h-8"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(node)}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${node.title}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => void open(node)}>Open</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameValue(node.title);
                          setRenaming(node);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMoving(node)}>
                        <Folder className="mr-2 h-4 w-4" />
                        Move to…
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void patch(node.id, { starred: !node.starred })}>
                        <Star className="mr-2 h-4 w-4" />
                        {node.starred ? "Remove star" : "Star"}
                      </DropdownMenuItem>
                      {node.kind === "file" && (
                        <DropdownMenuItem
                          onClick={async () => {
                            const url = await documentSignedUrl(node);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => void toTrash(node)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Move to trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        )}

        {shelf === "trash" && trashed.length > 0 && (
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            Things in the trash stay here until you delete them. Deleting is permanent.
          </p>
        )}
      </div>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              It will be created in {trail.length ? trail[trail.length - 1].title : "Documents"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitNewFolder();
              }}
              placeholder="Essays"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-value">Name</Label>
            <Input
              id="rename-value"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={!!moving} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Move {moving?.title}</DialogTitle>
            <DialogDescription>
              Pick where it should live. A folder cannot be moved inside itself, so its own folders
              are not listed.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[320px] space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => void submitMove(null)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              Documents
              {moving?.parent_id === null && (
                <Badge variant="secondary" className="ml-auto">
                  Here now
                </Badge>
              )}
            </button>
            {moveTargets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => void submitMove(target.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Folder className="h-4 w-4 text-primary" />
                <span className="truncate">{target.title}</span>
                {moving?.parent_id === target.id && (
                  <Badge variant="secondary" className="ml-auto">
                    Here now
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent delete */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.title} for good?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "folder"
                ? "The folder and everything inside it will be deleted. This cannot be undone."
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreview node={previewing} onOpenChange={(open) => { if (!open) setPreviewing(null); }} />
    </div>
  );
}
