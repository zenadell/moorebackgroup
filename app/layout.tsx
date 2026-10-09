import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoBack Dashboard | Portfolio & Live Market Intelligence",
  description: "Executive investment portfolio and live market intelligence dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
