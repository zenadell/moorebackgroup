import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MooreBach Group | Portfolio & Live Market Intelligence",
  description: "Executive investment portfolio and live market intelligence dashboard - https://moorebachgroup.com/dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && (event.reason.message || '').includes('M_ID')) {
                    event.preventDefault();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
