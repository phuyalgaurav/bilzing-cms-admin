import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body>
        <TooltipProvider delayDuration={250}>
          <AppProviders>{children}</AppProviders>
        </TooltipProvider>
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
