"use client";

import { useRef, useState, type DragEvent } from "react";

import { MAX_ATTACHMENTS, readFileAsAttachment, type DraftAttachment } from "@/lib/media";

type Props = {
  files: DraftAttachment[];
  onChange: (files: DraftAttachment[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  maxFiles?: number;
};

export function AttachmentDropzone({
  files,
  onChange,
  onError,
  disabled,
  maxFiles = MAX_ATTACHMENTS,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function addFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const room = Math.max(0, maxFiles - files.length);
    if (room <= 0) {
      onError?.(`Максимум ${maxFiles} вложения`);
      return;
    }
    try {
      const selected = Array.from(list).slice(0, room);
      const added: DraftAttachment[] = [];
      for (const file of selected) {
        added.push(await readFileAsAttachment(file));
      }
      onChange([...files, ...added].slice(0, maxFiles));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Ошибка файла");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  }

  const full = files.length >= maxFiles;

  return (
    <div className="grid min-w-0 gap-2.5">
      <button
        type="button"
        className={[
          "flex w-full min-w-0 cursor-pointer flex-col items-center gap-0.5 rounded-card border-[1.5px] border-dashed border-accent/35 px-3 py-3.5 text-center font-inherit text-ink-soft transition sm:px-4 sm:py-4",
          "bg-gradient-to-b from-accent-soft/45 to-white/55",
          dragging ? "border-solid border-accent bg-accent-soft/85" : "hover:border-accent hover:bg-accent-soft/65",
          full || disabled ? "cursor-not-allowed opacity-55" : "",
        ].join(" ")}
        disabled={disabled || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span
          className="mb-1 grid h-9 w-9 place-items-center rounded-[14px] bg-gradient-to-br from-white to-accent-soft text-accent-deep shadow-soft sm:h-10 sm:w-10"
          aria-hidden
        >
          <svg className="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="8" width="32" height="32" rx="10" fill="currentColor" opacity="0.12" />
            <path d="M24 14v14.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            <path
              d="M18.5 20.5 24 14l5.5 6.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 30.5c1.2 2.6 4.2 4.5 9 4.5s7.8-1.9 9-4.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="max-w-full text-[0.95rem] font-bold text-ink">
          {full ? "Больше нельзя добавить" : "Перетащите файлы сюда"}
        </span>
        <span className="max-w-full text-balance text-[0.8rem] leading-snug text-muted">
          или нажмите, чтобы выбрать фото
        </span>
        <span className="text-[0.8rem] text-muted">До 2.5MB каждое</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        disabled={disabled || full}
        onChange={(e) => void addFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0">
          {files.map((f) => (
            <li
              key={f.localId}
              className="flex items-center gap-2.5 rounded-panel border border-line bg-white/75 px-2.5 py-1.5"
            >
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.preview}
                  alt=""
                  className="h-10 w-10 rounded-lg border border-line object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs text-accent-deep">
                  ▶
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[0.9rem] font-semibold">{f.filename}</span>
                <span className="text-xs text-muted">фото</span>
              </span>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white text-lg leading-none text-muted"
                aria-label="Убрать"
                disabled={disabled}
                onClick={() => onChange(files.filter((x) => x.localId !== f.localId))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
