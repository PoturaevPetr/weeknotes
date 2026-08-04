"use client";

import { FormEvent, useState } from "react";

import { AttachmentDropzone } from "@/components/AttachmentDropzone";
import { DueDatePicker } from "@/components/DueDatePicker";
import { explainGeoFailure, requestGeoCoords } from "@/lib/geolocation";
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
  onOpenMap?: () => void;
};

export function NoteForm({ onSubmit, coords, onCoordsChange, onOpenMap }: Props) {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setGeoError(null);
    try {
      await onSubmit(text.trim(), coords, dueAt, toAttachmentInputs(files));
      setText("");
      setDueAt(null);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать заметку");
    } finally {
      setBusy(false);
    }
  }

  async function requestMyLocation() {
    setGeoError(null);
    setGeoBusy(true);
    try {
      onCoordsChange(await requestGeoCoords());
    } catch (err) {
      setGeoError(explainGeoFailure(err));
    } finally {
      setGeoBusy(false);
    }
  }

  return (
    <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain pb-3 [-webkit-overflow-scrolling:touch]">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Текст</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Идея, задача, мысль…"
            required
            autoFocus
            className="min-w-0"
          />
        </label>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Срок исполнения</span>
          <DueDatePicker value={dueAt} onChange={setDueAt} disabled={busy} />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Вложения</span>
          <AttachmentDropzone
            files={files}
            onChange={setFiles}
            onError={setError}
            disabled={busy}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          {coords ? (
            <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1.5 text-[0.82rem] font-semibold text-accent-deep">
              <span className="min-w-0 truncate">
                📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </span>
              <button
                type="button"
                className="shrink-0 border-0 bg-transparent p-1 font-semibold text-accent-deep underline underline-offset-2"
                onClick={() => onCoordsChange(null)}
              >
                сбросить
              </button>
            </span>
          ) : geoBusy ? (
            <p className="m-0 text-[0.9rem] text-muted">Определяем координаты…</p>
          ) : (
            <p className="m-0 text-[0.9rem] text-muted">Точка на карте — по желанию</p>
          )}
          <div className="flex min-w-0 flex-wrap gap-2">
            <button
              type="button"
              className="btn btn--soft"
              disabled={busy || geoBusy}
              onClick={() => void requestMyLocation()}
            >
              {geoBusy ? "Определяем…" : geoError ? "Повторить" : "Моя гео"}
            </button>
            {onOpenMap && (
              <button type="button" className="btn" disabled={busy} onClick={onOpenMap}>
                На карте
              </button>
            )}
          </div>
          {geoError && (
            <p className="m-0 break-words rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3 py-2.5 text-[0.9rem] text-danger">
              {geoError}
            </p>
          )}
        </div>
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
          {busy ? "Публикуем…" : "Опубликовать"}
        </button>
      </div>
    </form>
  );
}
