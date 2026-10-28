"use client";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

const FILE = "https://www.figma.com/design/KtFsDp6EgP6ILmbYwktBh6/SIP-Companion";
const proto = (node) => `https://www.figma.com/proto/KtFsDp6EgP6ILmbYwktBh6/SIP-Companion?node-id=${node}&starting-point-node-id=${node}&scaling=scale-down&content-scaling=fixed&hide-ui=1`;
const TABS = [
  { id: "companion", site: "prototype", label: "Companion prototype", url: proto("5-91"), note: "Start on a SIP with two missed instalments. Tap the dots, the suggested questions, Pay now, Change date, Pause or Stop. Every tap goes where the live app goes." },
  { id: "engine", site: "engine", label: "Engine prototype", url: proto("11-160"), note: "Mobile flow: ask, see your pattern, or say you're thinking of stopping and pick a reason." },
  { id: "research", site: "engine", label: "Research prototype", url: proto("22-130"), wide: true, note: "Desktop workspace for the product team: the answer, the ranked leaks, a story drawer from Evidence, Ask, Classify and Method. Tabs and rows are clickable." },
  { id: "file", label: "Design file", url: FILE, note: "The full file: tokens in light and dark, components, 16 Companion states, the Engine, Research and Home screens, and the user flows." }
];
const embed = (u) => "https://www.figma.com/embed?embed_host=share&url=" + encodeURIComponent(u);

export default function Design({ site = "prototype" }) {
  const tabs = TABS.filter((x) => !x.site || x.site === site);
  const [tab, setTab] = useState(tabs[0].id);
  const t = tabs.find((x) => x.id === tab);
  return (
    <div className="page" style={{ gap: 24 }}>
      <header className="sh" style={{ gap: 12 }}>
        <h1 className="big" style={{ fontSize: "clamp(2rem,4.4vw,2.8rem)" }}>Design</h1>
        <p className="lede">{site === "engine" ? "The Figma designs behind the discovery engine and its research view." : "The Figma design behind the Companion prototype."} The site and the file share the same colour and type tokens, so what you see here is what ships.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="Figma views">
        {tabs.map((x) => <button key={x.id} className="tab" role="tab" type="button" aria-selected={tab === x.id} onClick={() => setTab(x.id)}>{x.label}</button>)}
      </div>
      <p className="note" style={{ margin: 0 }}>{t.note}</p>
      <div className={"figma-frame" + (tab === "file" || t.wide ? "" : " proto")}>
        <iframe key={t.id} title={t.label} src={embed(t.url)} allowFullScreen loading="lazy" />
      </div>
      <p className="note" style={{ margin: 0 }}><a href={tab === "file" ? FILE : t.url} target="_blank" rel="noopener">Open in Figma <ArrowUpRight size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /></a> · Prototypes are tappable right here.</p>
    </div>
  );
}
