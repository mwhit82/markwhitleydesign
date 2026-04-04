import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { FlowFieldBackground } from "@/components/flow-field-background";
import { SiteShell } from "@/components/site-shell";
import { ThemeScript } from "@/components/theme-script";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
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
      <body className={`${fraunces.variable} ${manrope.variable}`}>
        <ThemeScript />
        <FlowFieldBackground />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
