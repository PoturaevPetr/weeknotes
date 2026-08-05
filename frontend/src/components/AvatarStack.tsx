"use client";

import { avatarPalette, initials } from "@/lib/format";
import type { BoardMember } from "@/lib/types";

type Props = {
  members: BoardMember[];
  max?: number;
};

export function AvatarStack({ members, max = 4 }: Props) {
  const visible = members.slice(0, max);
  const rest = members.length - visible.length;

  if (members.length === 0) {
    return <span className="text-[0.9rem] text-muted">нет участников</span>;
  }

  return (
    <div className="mt-1 flex items-center" aria-label={`Участников: ${members.length}`}>
      {visible.map((m, i) => {
        const palette = avatarPalette(m.display_name);
        return (
          <span
            key={m.id}
            className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[0.65rem] font-bold shadow-sm ${
              i === 0 ? "" : "-ml-1.5"
            }`}
            style={{ background: palette.bg, color: palette.fg }}
            title={m.display_name}
          >
            {initials(m.display_name)}
          </span>
        );
      })}
      {rest > 0 && (
        <span
          className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#f2ebe1] text-[0.68rem] font-bold text-ink-soft shadow-sm"
          title={`Ещё ${rest}`}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
