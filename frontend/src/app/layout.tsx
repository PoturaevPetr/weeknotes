import type { Metadata, Viewport } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";

import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const display = Source_Serif_4({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Weeknotes",
  description: "Collaborative boards for shared notes",
  applicationName: "Weeknotes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weeknotes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f5f3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${sans.variable} ${display.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
