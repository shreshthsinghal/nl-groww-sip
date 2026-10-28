// The codebase serves two separate sites. Each Vercel project serves one of them:
//   prototype → nl-groww-sip.vercel.app      (SIP Companion MVP, its evaluation and test tools)
//   engine    → nl-groww-engine.vercel.app   (AI discovery engine and its research view)
// The site is picked from SITE, or else from the host name.
export const PROTOTYPE_URL = process.env.NEXT_PUBLIC_PROTOTYPE_URL || "https://nl-groww-sip.vercel.app";
export const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || "https://nl-groww-engine.vercel.app";

export function siteFor(host) {
  const forced = process.env.SITE;
  if (forced === "engine" || forced === "prototype") return forced;
  return /(^|\.|-)engine[.-]/.test(host || "") || /^nl-groww-engine/.test(host || "") ? "engine" : "prototype";
}

// Routes that belong to only one site. Anything else (Next assets, /design) is shared.
export const PROTOTYPE_ONLY = ["/companion", "/built", "/lab", "/eval", "/metrics"];
export const ENGINE_ONLY = ["/engine", "/research", "/research-v1"];
export const PROTOTYPE_API = ["/api/assist", "/api/companion", "/api/eval", "/api/sample"];
export const ENGINE_API = ["/api/checkup", "/api/research"];

export const under = (path, list) => list.some((p) => path === p || path.startsWith(p + "/"));
