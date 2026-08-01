import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Plus, Trash2, Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCounsellorNotes, type CounsellorNote } from "@/hooks/useCounsellorNotes";
import { useToast } from "@/hooks/use-toast";

interface Props {
  studentId: string;
}

/**
 * Private notes panel — visible only to the owning counsellor and admins.
 * Used for internal context tracking ("Parents are highly involved", "Needs motivation", etc.).
 */
export function PrivateNotesPanel({ studentId }: Props) {
  const { toast } = useToast();
  const { items, loading, add, update, remove } = useCounsellorNotes(studentId);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const body = draft.trim();
    if (body.length < 2) return;
    setSubmitting(true);
    const { error } = await add(body);
    setSubmitting(false);
    if (error) toast({ variant: "destructive", title: "Could not save", description: error.message });
    else { setDraft(""); toast({ title: "Note saved" }); }
  };

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Private notes</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">Only you and admins can see these</span>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Internal context — e.g. parents highly involved, needs motivation, prefers afternoon meetings…"
          rows={3}
          maxLength={2000}
          className="resize-none"
        />
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={submit} disabled={submitting || draft.trim().length < 2}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Add note
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No private notes yet.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((n) => (
              <NoteItem key={n.id} note={n} onUpdate={update} onDelete={remove} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function NoteItem({
  note, onUpdate, onDelete,
}: {
  note: CounsellorNote;
  onUpdate: (id: string, body: string) => Promise<{ error: { message: string } | null }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await onUpdate(note.id, body.trim());
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Could not update", description: error.message });
    else { setEditing(false); toast({ title: "Note updated" }); }
  };

  return (
    <motion.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="card-elevated p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] text-muted-foreground">
          {new Date(note.created_at).toLocaleString()}
          {note.updated_at !== note.created_at && " · edited"}
        </span>
        <div className="flex items-center gap-1">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setEditing(false); setBody(note.body); }}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} className="resize-none" />
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={saving || body.trim().length < 2}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
      )}
    </motion.li>
  );
}
