import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/hnj8apl.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
