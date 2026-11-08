import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
const cairo=Cairo({subsets:["arabic","latin"],variable:"--font-cairo",display:"swap"});
export const metadata:Metadata={title:"تاكسي العاصمة | CAPITAL TAXI",description:"منصة التنقل الذكي في العريش وشمال سيناء"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body className={cairo.variable}>{children}</body></html>}
