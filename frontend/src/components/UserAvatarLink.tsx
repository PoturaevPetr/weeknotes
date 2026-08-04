"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { initials } from "@/lib/format";

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
      <span className="grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full bg-accent-soft text-[0.8rem] font-bold text-accent-deep">
        {initials(user.display_name)}
      </span>
    </Link>
  );
}
