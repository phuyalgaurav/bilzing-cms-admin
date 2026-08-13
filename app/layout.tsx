import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "Content Studio", template: "%s · Content Studio" },
  description: "A focused workspace for publishing and managing your website.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${inter.variable} ${fraunces.variable}`}
    >
      <body>
        <TooltipProvider delayDuration={250}>
          <AppProviders>{children}</AppProviders>
        </TooltipProvider>
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
