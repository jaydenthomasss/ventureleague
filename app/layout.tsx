import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VentureLeague — Business Simulation for High Schoolers",
  description:
    "A competitive business simulation game where high school students manage virtual companies, make strategic decisions, and compete for market dominance.",
  keywords: ["business simulation", "high school", "education", "economics", "entrepreneurship"],
  openGraph: {
    title: "VentureLeague",
    description: "Competitive business simulation for high school students",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-[#0a0a0a] text-white antialiased font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
