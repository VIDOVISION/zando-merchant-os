import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users — deny-all-except-public pattern
  const PUBLIC_PATHS = ['/login', '/signup', '/success', '/cancel', '/unauthorized'];
  const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))
    || request.nextUrl.pathname.startsWith('/api/');
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
