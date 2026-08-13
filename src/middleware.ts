import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is optional everywhere: the course is fully usable signed out
// (device-local progress). Signing in adds cross-device sync. The API route
// checks auth itself.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
