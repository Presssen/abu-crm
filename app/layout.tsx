import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABU CRM",
  description: "Modern CRM for ABU Management",
  openGraph: {
    title: "ABU CRM",
    description: "Modern CRM for ABU Management",
    images: ["https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866"],
  },
  icons: {
    icon: "https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
