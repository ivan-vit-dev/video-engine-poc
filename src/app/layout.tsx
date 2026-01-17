import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Video Engine POC",
  description: "Modular video engine proof of concept",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
