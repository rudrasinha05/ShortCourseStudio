import type { Metadata } from "next";
import {SITE_NAME} from "@/lib/programme";
import "./globals.css";
export const metadata: Metadata = {title:{default:SITE_NAME,template:`%s | ${SITE_NAME}`},description:"Proposed five-day practical courses with guided labs and final projects across six subject tracks.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en-IN"><body>{children}</body></html>;
}
