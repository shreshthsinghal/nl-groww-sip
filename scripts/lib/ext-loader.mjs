// Node resolve hook for offline tests: lets extensionless relative imports (bundler style) resolve to .js files.
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (spec.startsWith(".") && !/\.[mc]?js$|\.json$/.test(spec)) return next(spec + ".js", ctx); throw e; }
}
export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { ...(ctx.importAttributes || {}), type: "json" } });
  return next(url, ctx);
}
