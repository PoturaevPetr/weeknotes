"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { avatarPalette, initials } from "@/lib/format";

type Props = {
  user: User;
};

export function UserAvatarLink({ user }: Props) {
  return (
    <Link
      href="/profile"
      className="inline-flex rounded-full no-underline transition active:scale-95"
      aria-label="Профиль"
      title={user.display_name}
    >
      <span
        className="grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full text-[0.8rem] font-bold"
        style={{
          background: avatarPalette(user.display_name).bg,
          color: avatarPalette(user.display_name).fg,
        }}
      >
        {initials(user.display_name)}
      </span>
    </Link>
  );
}
