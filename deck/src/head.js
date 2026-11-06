// NL_Groww_Final_v2.pptx: 10-slide Groww SIP Continuation case study.
// Built with pptxgenjs on a themed layout; every text run is >= 14 pt.
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require("/mnt/skills/public/pptx/scripts/apply_theme.js");

const IMG = path.join(__dirname, "img");
const OUT = path.join(__dirname, "Groww_PM_Fellowship_Final.pptx");

const THEME = {
  name: "NL Groww Editorial",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: { dk1: "141826", lt1: "FFFFFF", dk2: "4A5168", lt2: "F7F5F1", accent1: "4B2BA8", accent2: "0F766E", accent3: "C2462B", accent4: "9A5B00", accent5: "EEE9FB", accent6: "E2F1EE", hlink: "4B2BA8", folHlink: "3A2085" }
};
const K = {
  ink: "141826", mute: "4A5168", soft: "6B7186", paper: "F7F5F1", white: "FFFFFF", rule: "E2DED6",
  pur: "4B2BA8", purD: "3A2085", purT: "EEE9FB", lilac: "CDBFF7",
  teal: "0F766E", tealT: "E2F1EE", coral: "C2462B", coralT: "FBE8E2", amber: "9A5B00", amberT: "FCF0D8",
  pink: "FF7A8E", grey: "ECEAE4", navy2: "232A40"
};
const URL = {
  proto: "https://nl-groww-sip.vercel.app/companion",
  built: "https://nl-groww-sip.vercel.app/built",
  engine: "https://nl-groww-engine.vercel.app",
  research: "https://nl-groww-engine.vercel.app/research"
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.title = "NL_Groww: SIP Continuation case study";
pres.author = "NL_Groww";
pres.company = "NL_Groww";
pres.subject = "Groww growth case study: 12-month first-SIP continuation";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: K.paper },
  margin: [0.4, 0.5, 0.45, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.62, w: 11.6, h: 0.92, fontFace: "Arial", fontSize: 28, bold: true, color: K.ink, align: "left", valign: "top", margin: 0, lineSpacingMultiple: 0.95 }, text: "" } }
  ],
  slideNumber: { x: 12.38, y: 7.05, w: 0.45, h: 0.3, fontSize: 14, color: K.soft, align: "right", fontFace: "Calibri" }
});
pres.defineSlideMaster({ title: "COVER", background: { color: K.paper }, objects: [] });
// Session 1+: redesigned slides use the warm paper of the final design system (F6F1E6)
pres.defineSlideMaster({ title: "COVER2", background: { color: "F6F1E6" }, objects: [] });
pres.defineSlideMaster({
  title: "CONTENT2", background: { color: "F6F1E6" }, margin: [0.4, 0.5, 0.45, 0.5],
  objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.62, w: 11.0, h: 0.62, fontFace: "Arial", fontSize: 28, bold: true, color: K.ink, align: "left", valign: "top", margin: 0, lineSpacingMultiple: 0.95 }, text: "" } }],
  slideNumber: { x: 12.38, y: 7.05, w: 0.45, h: 0.3, fontSize: 14, color: K.soft, align: "right", fontFace: "Calibri" }
});

/* ---------------- helpers ---------------- */
function bwB() { return 1.17; }
function T(s, text, o) { s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 15, color: K.ink, valign: "top", fit: "none", fontFace: "Calibri" }, o)); }
function H(s, text, o) { T(s, text, Object.assign({ fontFace: "Arial", bold: true }, o)); }
function box(s, o) {
  const shape = o.r === 0 ? pres.shapes.RECTANGLE : pres.shapes.ROUNDED_RECTANGLE;
  const opt = { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: o.fill || K.white }, line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash || "solid" } : { type: "none" }, objectName: o.name };
  if (o.r !== 0) opt.rectRadius = o.r == null ? 0.1 : o.r;
  if (o.shadow) opt.shadow = { type: "outer", color: "141826", opacity: 0.08, blur: 6, offset: 2, angle: 90 };
  s.addShape(shape, opt);
}
function line(s, x1, y1, x2, y2, o = {}) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.0001, h: Math.abs(y2 - y1) || 0.0001, flipV: (y2 < y1) !== (x2 < x1) && y1 !== y2 && x1 !== x2, line: { color: o.color || K.rule, width: o.w || 1.5, dashType: o.dash || "solid", endArrowType: o.arrow ? "triangle" : undefined }, objectName: o.name });
}
const TAGS = {
  verified: { fill: K.ink, color: K.white, line: K.ink, t: "Verified" },
  observed: { fill: K.tealT, color: K.teal, line: K.teal, t: "Observed" },
  directional: { fill: K.purT, color: K.pur, line: K.pur, t: "Directional" },
  hypothesis: { fill: K.white, color: K.coral, line: K.coral, dash: "dash", t: "Hypothesis" },
  assumption: { fill: K.amberT, color: K.amber, line: K.amber, t: "Assumption" },
  pending: { fill: K.white, color: K.soft, line: K.soft, dash: "dash", t: "Pending" },
  built: { fill: K.pur, color: K.white, line: K.pur, t: "Built" },
  simulated: { fill: K.tealT, color: K.teal, line: K.teal, t: "Simulated" },
  planned: { fill: K.white, color: K.amber, line: K.amber, dash: "dash", t: "Planned" }
};
function tagW(text) { return 0.19 + text.length * 0.088; }
function tag(s, x, y, kind, text) {
  const st = TAGS[kind]; const t = text || st.t; const w = tagW(t);
  s.addText(t, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.13, x, y, w, h: 0.27, fontSize: 14, bold: true, fontFace: "Calibri", color: st.color, fill: { color: st.fill }, line: { color: st.line, width: 1, dashType: st.dash || "solid" }, align: "center", valign: "middle", margin: 0, objectName: "tag-" + kind });
  return w;
}
function kicker(s, t) { T(s, t, { x: 0.5, y: 0.3, w: 9.5, h: 0.28, fontSize: 14, bold: true, color: K.pur, charSpacing: 1.5, objectName: "kicker" }); }
function footer(s, runs) { T(s, runs, { x: 0.5, y: 7.05, w: 11.7, h: 0.3, fontSize: 14, color: K.soft, objectName: "sources" }); }
function mark(s, x, y, sz = 0.42, withWord = true) {
  box(s, { x, y, w: sz, h: sz, fill: K.pur, r: sz * 0.28, name: "mark-square" });
  const P = [[0.21, 0.68], [0.39, 0.5], [0.52, 0.59], [0.75, 0.32]].map(([a, b]) => [x + a * sz, y + b * sz]);
  for (let i = 0; i < 3; i++) line(s, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], { color: K.white, w: 2.2, name: "mark-line" });
  s.addShape(pres.shapes.OVAL, { x: P[3][0] - 0.055, y: P[3][1] - 0.055, w: 0.11, h: 0.11, fill: { color: K.pink }, line: { type: "none" }, objectName: "mark-dot" });
  if (withWord) H(s, "Groww", { x: x + sz + 0.1, y: y + 0.02, w: 1.1, h: sz - 0.04, fontSize: 20, valign: "middle", color: K.ink, objectName: "mark-word" });
}
function header(s, k, title) { kicker(s, k); s.addText(title, { placeholder: "title" }); mark(s, 12.0 - 1.18 + 0.55, 0.28, 0.36, true); }
function strip(s, y, h, label, runs, o = {}) {
  box(s, { x: 0.5, y, w: 12.33, h, fill: o.fill || K.white, line: o.line || K.ink, lw: 1.75, r: 0.1, name: "insight-strip" });
  H(s, label, { x: 0.72, y, w: o.lw || 1.85, h, fontSize: 16, color: o.lc || K.pur, valign: "middle" });
  line(s, 0.72 + (o.lw || 1.85) + 0.05, y + 0.14, 0.72 + (o.lw || 1.85) + 0.05, y + h - 0.14, { color: K.rule, w: 1.5 });
  T(s, runs, { x: 0.72 + (o.lw || 1.85) + 0.25, y, w: 12.33 - (o.lw || 1.85) - 0.65, h, fontSize: 15, valign: "middle", objectName: "insight-text" });
}
const b = (t, o) => ({ text: t, options: Object.assign({ bold: true }, o) });
const n = (t, o) => ({ text: t, options: o || {} });
const br = (t, o) => ({ text: t, options: Object.assign({ breakLine: true }, o) });
const link = (t, url, o) => ({ text: t, options: Object.assign({ hyperlink: { url }, color: K.pur, underline: { style: "sng" } }, o) });

