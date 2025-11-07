import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

// Default metadata - will be overridden by SiteMetadata component when settings load
export const metadata: Metadata = {
  title: "Media Hub",
  description: "Your centralized media management platform",
  icons: {
    icon: '/favicon.jpg',
    shortcut: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
