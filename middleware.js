import { NextResponse } from "next/server";
import { siteFor, under, PROTOTYPE_URL, ENGINE_URL, PROTOTYPE_ONLY, ENGINE_ONLY, PROTOTYPE_API, ENGINE_API } from "./lib/site";

export function middleware(req) {
  const site = siteFor(req.headers.get("host"));
  const { pathname, search } = req.nextUrl;
  const pass = () => { const h = new Headers(req.headers); h.set("x-site", site); return NextResponse.next({ request: { headers: h } }); };
  const away = (base, path) => NextResponse.redirect(base + path + search, 307);
  const notFound = () => new NextResponse(JSON.stringify({ error: "Not found on this site" }), { status: 404, headers: { "content-type": "application/json" } });

  if (site === "prototype") {
    if (pathname === "/") return NextResponse.redirect(new URL("/companion" + search, req.url), 307);
    if (under(pathname, ENGINE_API)) return notFound();
    if (under(pathname, ENGINE_ONLY)) return away(ENGINE_URL, pathname.startsWith("/engine") ? "/" : pathname);
    return pass();
  }
  // engine site
  if (pathname === "/") { const h = new Headers(req.headers); h.set("x-site", site); return NextResponse.rewrite(new URL("/engine" + search, req.url), { request: { headers: h } }); }
  if (pathname === "/engine") return NextResponse.redirect(new URL("/" + search, req.url), 307);
  if (under(pathname, PROTOTYPE_API)) return notFound();
  if (under(pathname, PROTOTYPE_ONLY)) return away(PROTOTYPE_URL, pathname);
  return pass();
}

export const config = { matcher: ["/((?!_next/|favicon|.*\\.(?:png|jpg|svg|ico|css|js|json|txt|woff2?)$).*)", "/research-v1/:path*"] };
