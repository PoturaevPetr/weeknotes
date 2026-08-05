"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, Clock, ImagePlus, MapPin, Sparkles } from "lucide-react";

import { AttachmentDropzone } from "@/components/AttachmentDropzone";
import { DueDatePicker } from "@/components/DueDatePicker";
import { EditLocationField } from "@/components/EditLocationField";
import { toAttachmentInputs, type DraftAttachment } from "@/lib/media";
import type { AttachmentInput } from "@/lib/types";

type Coords = { latitude: number; longitude: number } | null;

type Props = {
  onSubmit: (
    text: string,
    coords: Coords,
    dueAt: string | null,
    attachments: AttachmentInput[],
  ) => Promise<void>;
  coords: Coords;
  onCoordsChange: (coords: Coords) => void;
};

export function NoteForm({ onSubmit, coords, onCoordsChange }: Props) {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (coords) setShowDetails(true);
  }, [coords]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim(), coords, dueAt, toAttachmentInputs(files));
      setText("");
      setDueAt(null);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так — попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain pb-3 [-webkit-overflow-scrolling:touch]">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Ваша идея</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Куда сходить, что попробовать, о чём не забыть…"
            required
            autoFocus
            className="min-w-0"
          />
        </label>

        <button
          type="button"
          className="flex min-h-9 w-full items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[0.9rem] font-semibold text-muted transition hover:text-ink"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
        >
          <ChevronRight
            size={16}
            aria-hidden
            className={`transition-transform ${showDetails ? "rotate-90" : ""}`}
          />
          <span>Добавить детали</span>
          {!showDetails && (dueAt || files.length > 0 || coords) && (
            <span className="font-normal">
              (
              {[
                dueAt ? "срок" : null,
                files.length > 0 ? "фото" : null,
                coords ? "место" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              )
            </span>
          )}
        </button>

        {showDetails && (
          <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold tracking-wide text-muted">
                <Clock size={14} aria-hidden />
                Когда
              </span>
              <DueDatePicker value={dueAt} onChange={setDueAt} disabled={busy} />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold tracking-wide text-muted">
                <ImagePlus size={14} aria-hidden />
                Фото
              </span>
              <AttachmentDropzone
                files={files}
                onChange={setFiles}
                onError={setError}
                disabled={busy}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold tracking-wide text-muted">
                <MapPin size={14} aria-hidden />
                Где
              </span>
              <EditLocationField value={coords} onChange={onCoordsChange} disabled={busy} />
            </div>
          </>
        )}
        {error && (
          <p className="m-0 break-words rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3 py-2.5 text-[0.9rem] text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-white pt-3">
        <button
          type="submit"
          className="btn btn--primary btn--block shadow-none"
          disabled={busy || !text.trim()}
        >
          <Sparkles size={16} aria-hidden />
          {busy ? "Отправляем…" : "Предложить идею"}
        </button>
      </div>
    </form>
  );
}
