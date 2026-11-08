import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تاكسي العاصمة | CAPITAL TAXI",
  description: "منصة التنقل الذكي في العريش وشمال سيناء",
  applicationName: "تاكسي العاصمة",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "تاكسي العاصمة",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.variable}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
