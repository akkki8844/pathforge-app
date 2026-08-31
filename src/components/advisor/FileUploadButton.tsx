import { useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPT = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain", "text/markdown", "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/webm",
].join(",");

export function FileUploadButton({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          if (ref.current) ref.current.value = "";
        }}
      />
      {/* A `+` rather than a paperclip. It leads the composer's control row,
          where it reads as "add something to this message" — which is what it
          does, and what a first-time user is looking for there. */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        aria-label="Attach files"
        title="Attach files"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </>
  );
}
