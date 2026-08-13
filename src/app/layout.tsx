import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { ProgressProvider } from "@/lib/progress";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Interpretable — transformers, LLMs & mech interp",
    template: "%s · Interpretable",
  },
  description:
    "An interactive crash course: transformer fundamentals, how LLMs are made, and mechanistic interpretability — built for AI safety.",
};

export const viewport: Viewport = {
  themeColor: "#141413",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider appearance={{ theme: dark }}>
          <ProgressProvider>
            <Sidebar />
            <main className="lg:pl-72">{children}</main>
          </ProgressProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
