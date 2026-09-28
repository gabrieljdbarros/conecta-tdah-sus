import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
 

export function middleware(request: NextRequest) {
  
    if (!request.cookies.has('session'))
        return NextResponse.redirect(new URL('/', request.url))

    return NextResponse.next();
}
 
export const config = {
  matcher: '/admin/:path*',
}