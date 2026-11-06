import html, sys
sys.path.insert(0, ".")
from notes_content import *
E = lambda t: html.escape(t).replace("\n\n", "</p><p>")
CSS = """
@page { size: A4; margin: 16mm 15mm; }
body { font-family: 'Liberation Sans', Arial, sans-serif; color: #141826; font-size: 10.5pt; line-height: 1.45; }
h1 { font-size: 20pt; color: #4B2BA8; margin: 0 0 4px; } h2 { font-size: 14pt; color: #4B2BA8; margin: 18px 0 6px; border-bottom: 1.5px solid #E2DED6; padding-bottom: 3px; }
h3 { font-size: 11.5pt; margin: 10px 0 4px; } .sub { color: #4A5168; margin-bottom: 14px; }
.k { font-weight: bold; color: #4A5168; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .04em; margin-top: 8px; }
.core { background: #EEE9FB; padding: 8px 10px; border-left: 4px solid #4B2BA8; font-weight: bold; }
.slide { page-break-inside: avoid; break-inside: avoid; margin-bottom: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; } td, th { border: 1px solid #E2DED6; padding: 5px 6px; vertical-align: top; text-align: left; } th { background: #F2EFE9; }
.q { margin: 10px 0; page-break-inside: avoid; } .q b { color: #4B2BA8; } .unk { color: #9A5B00; }
ol li, ul li { margin-bottom: 4px; } .note { color: #4A5168; font-size: 9.5pt; }
"""
def page(title, sub, body):
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style></head><body><h1>{title}</h1><div class='sub'>{sub}</div>{body}</body></html>"

# Speaker notes
b = ["<h2>Talk tracks</h2><h3>5-minute version</h3><table><tr><th>Slide</th><th>What to say</th></tr>"]
b += [f"<tr><td>{E(a)}</td><td>{E(c)}</td></tr>" for a, c in TRACK5]
b.append(f"</table><h3>8-minute version</h3><p>{E(TRACK8_EXTRA)}</p>")
b.append("<h2>Slide-by-slide notes</h2>")
for s in SLIDES:
    b.append(f"<div class='slide'><h3>Slide {s['n']} · {E(s['title'])}</h3><div class='k'>A · Core message</div><div class='core'>{E(s['core'])}</div>"
             f"<div class='k'>B · Speaker notes</div><p>{E(s['notes'])}</p><div class='k'>C · Evidence</div><p class='note'>{E(s['evidence'])}</p>"
             f"<div class='k'>D · Transition</div><p>{E(s['transition'])}</p><div class='k'>E · Likely challenge</div><p><i>{E(s['challenge'])}</i></p>"
             f"<div class='k'>F · Strong answer</div><p>{E(s['answer'])}</p></div>")
b.append("<h2>Live Companion demo (60–90 s)</h2><p class='note'>Real UI, production build 231973d, scenario A. The reply mode label under every answer is one of: Live AI · Rule-based · verified sources · Rule-based · AI limit reached · Rule-based · AI unavailable · Rule-based · AI draft didn't pass checks · Safety guard.</p><h3>Version 1 · live AI available</h3><ol>")
b += [f"<li>{E(x)}</li>" for x in DEMO_LIVE]
b.append(f"</ol><h3>Version 2 · live AI unavailable</h3><p>{E(DEMO_FALLBACK_NOTE)}</p><h3>30-second emergency explanation</h3><p>{E(DEMO_EMERGENCY)}</p>")
b.append("<h2>Rehearsal guide</h2><table><tr><th>Moment</th><th>Guidance</th></tr>")
b += [f"<tr><td><b>{E(a)}</b></td><td>{E(c)}</td></tr>" for a, c in REHEARSAL]
b.append("</table>")
open("speaker.html", "w").write(page("SIP continuation case study · Speaker notes", "Talk tracks, slide notes, demo script and rehearsal guide · prepared 5 Nov 2026 · results as of production build 231973d (6 Nov post-fix run pending)", "".join(b)))

# Q&A prep
q = ["<h2>Toughest questions</h2>"]
for i, (qq, a, u) in enumerate(QA, 1):
    q.append(f"<div class='q'><b>{i}. {E(qq)}</b><br>{E(a)}<br><span class='unk'>Still unknown: {E(u)}</span></div>")
q.append("<h2>Final evaluator scorecard</h2><table><tr><th>Dimension</th><th>Weight</th><th>Score</th><th>Deductions and risks</th><th>Highest-value improvement</th></tr>")
tot = 0
for d, w, sc, why, imp in RUBRIC:
    tot += sc; q.append(f"<tr><td>{E(d)}</td><td>{w}</td><td><b>{sc}</b></td><td>{E(why)}</td><td>{E(imp)}</td></tr>")
q.append(f"<tr><td><b>Total</b></td><td>100</td><td><b>{tot}</b></td><td colspan='2'>Submission quality, not business impact: no retention effect has been measured.</td></tr></table>")
open("qa.html", "w").write(page("SIP continuation case study · Q&A preparation", "Answers use only evidence in the project reports as of 5 Nov 2026. Where something is unknown, say so.", "".join(q)))
print("total", tot)
