import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reframe — UI redesign studio",
  description:
    "A fresh perspective for your UI. Import a website or repository, explore design systems, and export your redesigned page.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
