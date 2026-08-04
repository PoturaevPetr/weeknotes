"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Sticky page header that solidifies on scroll so controls don't float over content. */
export function StickyHeader({ children, className = "" }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-20 mb-5 -mx-1.5 rounded-b-card rounded-t-[1.75rem] px-2.5 pb-3 pt-2 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-200",
        scrolled
          ? "border-b border-[rgba(20,32,28,0.08)] bg-[#eef3f0] shadow-[0_8px_24px_rgba(20,32,28,0.06)]"
          : "bg-gradient-to-b from-[#eef3f0]/92 via-[#eef3f0]/70 to-transparent backdrop-blur-[8px]",
        className,
      ].join(" ")}
    >
      {children}
    </header>
  );
}
