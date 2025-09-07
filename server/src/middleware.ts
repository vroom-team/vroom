import { NextRequest, NextResponse } from "next/server";
import CustomError from "./server/helpers/CustomError";
import * as jose from 'jose'
import { errorHandler } from "./server/helpers/ErrorHandler";

export async function middleware(request: NextRequest) {
  try {
    const api = request.nextUrl.pathname.startsWith("/api")
    const routes = ["/api/profile", "/api/wishlist", "/api/trips", "/api/post", "/api/comments", "/api/likes", "/api/follow"]
    const currentRoute = request.nextUrl.pathname
    
    if (api) {
      if (routes.some(route => currentRoute.startsWith(route))) {
        
        const authorization = request.headers.get('authorization')
        if (!authorization) throw new CustomError("Unauthorized", 401)
        const rawToken = authorization.split(" ")
        
        const tokenValue = rawToken[1]
        
        const secret = new TextEncoder().encode(process.env.SECRET_KEY)

        const { payload } = await jose.jwtVerify<{ id: string, email: string }>(tokenValue, secret)

        const newHeader = new Headers(request.headers)
        newHeader.set("x-user-id", payload.id)
        newHeader.set("x-user-email", payload.email)

        const response = NextResponse.next({
          headers: newHeader
        })
        
        return response
      }
    }
  } catch (err: unknown) {
    const { status, message } = errorHandler(err)
    return NextResponse.json({ message }, { status })
  }
}
