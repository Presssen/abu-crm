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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ABU CRM",
  },
  icons: {
    apple: [
      { url: "/abu_logo.png" },
    ],
  },
  openGraph: {
    title: "ABU CRM",
    description: "Modern CRM for ABU Management",
    images: ["https://cdn.shopify.com/s/files/1/0370/2466/1636/files/Abu_CRM.png?v=1770135720"],
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
