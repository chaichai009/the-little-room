import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Little Room",
  description: "A private miniature space, still in progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
