import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Ledger — The market, made clear",
  description: "A concise daily market brief, delivered before the opening bell.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
