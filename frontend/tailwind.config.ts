import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Keep existing global button/input rules stable during migration
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        muted: "var(--muted)",
        paper: "var(--paper)",
        panel: {
          DEFAULT: "var(--panel)",
          solid: "var(--panel-solid)",
        },
        line: "var(--line)",
        accent: {
          DEFAULT: "var(--accent)",
          deep: "var(--accent-deep)",
          soft: "var(--accent-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        liked: {
          DEFAULT: "var(--liked)",
          soft: "var(--liked-soft)",
        },
        done: {
          DEFAULT: "var(--done)",
          soft: "var(--done-bg)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "var(--radius)",
        panel: "var(--radius-sm)",
      },
      boxShadow: {
        card: "var(--shadow)",
        soft: "var(--shadow-sm)",
        accent: "0 8px 20px rgba(31, 122, 108, 0.25)",
      },
      minHeight: {
        tap: "var(--tap)",
      },
      minWidth: {
        tap: "var(--tap)",
      },
      maxWidth: {
        page: "960px",
        narrow: "440px",
        modal: "640px",
        "modal-tall": "720px",
      },
      spacing: {
        "safe-top": "var(--safe-top)",
        "safe-bottom": "var(--safe-bottom)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.45s ease both",
        fade: "fade 0.25s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
