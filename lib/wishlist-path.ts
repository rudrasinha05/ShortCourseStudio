export const wishlistStudentPath=(slug?:string)=>"/student?view=wishlist"+(slug?"&course="+encodeURIComponent(slug):"");
export const wishlistSignIn=(slug?:string)=>"/login?return_to="+encodeURIComponent(wishlistStudentPath(slug));
