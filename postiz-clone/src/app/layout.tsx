import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: `${BRAND.name} offers everything you need to manage your social media posts, build an audience, capture leads and grow your business.`,
  icons: {
    icon: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#612bd3"/><path d="M9 23V9h7.5c3.6 0 6 2.1 6 5.2s-2.4 5.3-6 5.3H13V23H9Zm4-7h3.3c1.5 0 2.4-.7 2.4-1.8S17.8 12.4 16.3 12.4H13V16Z" fill="#fff"/><circle cx="23.5" cy="22.5" r="2.5" fill="#c4b5fd"/></svg>'),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
