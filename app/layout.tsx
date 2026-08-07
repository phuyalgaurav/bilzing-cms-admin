import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Content Studio", template: "%s · Content Studio" },
  description: "A focused workspace for publishing and managing your website.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        <AppProviders>{children}</AppProviders>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
