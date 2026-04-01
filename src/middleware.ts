// src/middleware.ts
// import { createI18nMiddleware } from 'next-international/middleware';
import type { NextRequest } from 'next/server'; // Keep NextRequest for basic middleware structure
// import type { NextResponse } from 'next/server'; // Uncomment if using NextResponse.next()

// const I18nMiddleware = createI18nMiddleware({
//   locales: ['en', 'id'],
//   defaultLocale: 'en',
//   urlMappingStrategy: 'rewrite',
// });
 
export function middleware(request: NextRequest) {
  // return I18nMiddleware(request); // Ensure this is commented out
  // To ensure middleware still runs but does nothing with i18n:
  return undefined; // Or import NextResponse and return NextResponse.next() if you need other middleware logic
}
 
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)']
};
