import type { AttachmentInput } from "@/lib/types";

/** Soft server limit — do not mention in UI. */
export const MAX_ATTACHMENTS = 10;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type DraftAttachment = AttachmentInput & {
  preview?: string;
  localId: string;
};

export function mediaSrc(mime: string, data: string): string {
  if (data.startsWith("data:")) return data;
  return `data:${mime};base64,${data}`;
}

export function readFileAsAttachment(file: File): Promise<DraftAttachment> {
  return new Promise((resolve, reject) => {
    const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    if (isHeic) {
      reject(new Error("HEIC не поддерживается — сохраните как JPEG/PNG"));
      return;
    }
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
    if (!isImage) {
      reject(new Error("Можно прикрепить только изображение"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Изображение больше 15MB"));
      return;
    }

    let mime_type = file.type || "image/jpeg";
    if (mime_type === "image/jpg") mime_type = "image/jpeg";
    const filename = (file.name && file.name.trim()) || "photo.jpg";

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!base64) {
        reject(new Error("Пустой файл"));
        return;
      }
      resolve({
        localId: `${filename}-${file.size}-${Date.now()}-${Math.random()}`,
        kind: "image",
        mime_type,
        filename,
        data_base64: base64,
        preview: result,
      });
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export async function filesToDrafts(
  list: FileList | File[],
  currentCount: number,
): Promise<DraftAttachment[]> {
  const files = Array.from(list);
  const room = Math.max(0, MAX_ATTACHMENTS - currentCount);
  const selected = files.slice(0, room);
  const out: DraftAttachment[] = [];
  for (const file of selected) {
    out.push(await readFileAsAttachment(file));
  }
  return out;
}

export function toAttachmentInputs(drafts: DraftAttachment[]): AttachmentInput[] {
  return drafts.map(({ kind, mime_type, filename, data_base64 }) => ({
    kind,
    mime_type,
    filename,
    data_base64,
  }));
}
