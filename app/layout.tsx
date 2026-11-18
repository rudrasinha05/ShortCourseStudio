import type { Metadata, Viewport } from "next";
import {SITE_NAME} from "@/lib/programme";
import "./globals.css";
import {WishlistStatus} from "./wishlist-client";
export const metadata: Metadata = {title:{default:SITE_NAME,template:`%s | ${SITE_NAME}`},description:"Proposed five-day practical courses with guided labs and final projects across six subject tracks.",icons:{icon:"/favicon.svg"}};
export const viewport: Viewport = {width:"device-width", initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en-IN"><body>{children}<WishlistStatus/></body></html>;
}
