import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import { CommsEmpty, CommsPanel } from "@/components/comms/CommsShell";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { commsDb } from "@/integrations/supabase/communications";
import { fileSize, listTimestamp } from "@/lib/comms/format";
import type { MessageAttachment } from "@/lib/comms/types";
import { displayName, usePeople } from "@/hooks/comms/usePeople";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  useAttachmentUrl,
  useMessages,
} from "@/hooks/comms/useMessages";

/**
 * Everything shared in this team's chat.
 *
 * Files are not a separate store: a file *is* an attachment on a message, so
 * uploading here posts a message to the team chat. That is deliberate — a file
 * that appears in a Files tab with no trace in the conversation is a file nobody
 * knows arrived, and two upload paths would mean two sets of storage policies to
 * keep in agreement.
 */
export function FilesTab({
  conversationId,
  teamName,
}: {
  conversationId: string | null;
  teamName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { send } = useMessages(conversationId ?? undefined);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ["comms", "team-files", conversationId ?? "none"],
    enabled: !!conversationId,
    queryFn: async (): Promise<MessageAttachment[]> => {
      const { data, error } = await commsDb
        .from("message_attachments")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // The uploader is the sender of the message the attachment hangs off, so the
  // names come from those messages rather than from the attachment rows.
  const messageIds = useMemo(
    () => (attachments ?? []).map((a) => a.message_id),
    [attachments],
  );
  const { data: senders } = useQuery({
    queryKey: ["comms", "team-file-senders", messageIds.join(",")],
    enabled: messageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await commsDb
        .from("messages")
        .select("id,sender_id")
        .in("id", messageIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const senderByMessage = useMemo(
    () => new Map((senders ?? []).map((m) => [m.id, m.sender_id])),
    [senders],
  );
  const { people } = usePeople((senders ?? []).map((m) => m.sender_id));

  const upload = async (files: FileList | null) => {
    if (!files?.length || !conversationId) return;
    const chosen = Array.from(files).slice(0, 5);
    for (const f of chosen) {
      if (f.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`${f.name} is larger than 25 MB.`);
        return;
      }
      if (f.type && !ATTACHMENT_TYPES.includes(f.type)) {
        toast.error(`${f.name} is not a file type this team accepts.`);
        return;
      }
    }

    setUploading(true);
    try {
      await send.mutateAsync({
        body: chosen.length === 1 ? `Shared ${chosen[0].name}` : `Shared ${chosen.length} files`,
        files: chosen,
      });
      toast.success(chosen.length === 1 ? "File shared." : "Files shared.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload that file.");
    } finally {
      setUploading(false);
    }
  };

  if (!conversationId) {
    return (
      <CommsPanel>
        <CommsEmpty
          icon={FileText}
          title="This team has no chat yet"
          description="Files are shared through the team conversation, and this team doesn't have one."
        />
      </CommsPanel>
    );
  }

  const uploadButton = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ATTACHMENT_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <MotionButton
        size="sm"
        className="rounded-lg"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        Upload
      </MotionButton>
    </>
  );

  return (
    <CommsPanel
      title="Files"
      description={`Shared in ${teamName}'s chat. Uploading here posts to the conversation.`}
      icon={FileText}
      actions={uploadButton}
      bodyClassName={attachments?.length ? "p-0" : undefined}
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !attachments || attachments.length === 0 ? (
        <CommsEmpty
          icon={FileText}
          title="No files yet"
          description="Upload a document, a slide deck or an image and everyone in the team will see it in the chat."
        />
      ) : (
        <ul className="divide-y divide-border">
          {attachments.map((a) => (
            <FileRow
              key={a.id}
              attachment={a}
              uploader={people[senderByMessage.get(a.message_id) ?? ""]}
            />
          ))}
        </ul>
      )}
    </CommsPanel>
  );
}

function FileRow({
  attachment,
  uploader,
}: {
  attachment: MessageAttachment;
  uploader: ReturnType<typeof usePeople>["people"][string] | undefined;
}) {
  const { data: url } = useAttachmentUrl(attachment.storage_path);
  const isImage = attachment.mime_type.startsWith("image/");

  return (
    <li>
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {attachment.file_name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <PersonAvatar person={uploader} size="xs" />
            {displayName(uploader)} · {fileSize(attachment.file_size)} ·{" "}
            {listTimestamp(attachment.created_at)}
          </span>
        </span>

        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    </li>
  );
}
