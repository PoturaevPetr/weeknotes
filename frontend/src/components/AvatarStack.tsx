"use client";

import { initials } from "@/lib/format";
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
      {visible.map((m, i) => (
        <span
          key={m.id}
          className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-accent-soft text-[0.65rem] font-bold text-accent-deep shadow-sm ${
            i === 0 ? "" : "-ml-1.5"
          }`}
          title={m.display_name}
        >
          {initials(m.display_name)}
        </span>
      ))}
      {rest > 0 && (
        <span
          className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#e7eeea] text-[0.68rem] font-bold text-ink-soft shadow-sm"
          title={`Ещё ${rest}`}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
