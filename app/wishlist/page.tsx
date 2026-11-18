import {redirect} from "next/navigation";
import {wishlistStudentPath} from "@/lib/wishlist-path";

export const dynamic="force-dynamic";
export default function Wishlist(){
 redirect(wishlistStudentPath());
}
