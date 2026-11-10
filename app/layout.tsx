import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { ThemeScript } from "@/components/theme-script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://markwhitley.design"),
  title: "Mark Whitley | Product Design Engineer",
  description:
    "Modern portfolio for Mark Whitley, a senior staff product design engineer building AI-powered experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable}`}>
        <ThemeScript />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
