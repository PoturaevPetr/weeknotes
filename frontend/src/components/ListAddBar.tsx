"use client";

type Props = {
  label: string;
  onClick: () => void;
  title?: string;
};

/** Inline add control placed above a list. */
export function ListAddBar({ label, onClick, title }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      {title ? (
        <p className="m-0 text-sm font-semibold text-muted">{title}</p>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="inline-flex min-h-tap items-center gap-1.5 rounded-full border border-transparent bg-accent-soft px-3.5 py-2 font-semibold text-accent-deep transition hover:bg-accent/15"
        onClick={onClick}
        aria-label={label}
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-full bg-accent text-sm font-bold text-white"
          aria-hidden
        >
          +
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}
