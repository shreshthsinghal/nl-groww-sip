import "./globals.css";
import "./companion/companion.css";
import "./companion/app.css";
import "./companion/cx.css";
import "./engine/engine.css";
import "./research/research.css";
import { headers } from "next/headers";
import Nav from "@/components/Nav";

const META = {
  prototype: { title: "SIP Companion · Groww case study prototype", description: "A prototype that helps a first-time investor understand a missed SIP instalment and choose what to do, without pressure. Every AI answer is checked before it is shown." },
  engine: { title: "SIP Discovery Engine 2.0 · Groww case study", description: "Why first SIPs lapse: 450 coded public stories you can search, a transparent opportunity ranking with scenario analysis, a grounded research agent and the human validation behind the AI labels." }
};
async function site() { return (await headers()).get("x-site") === "engine" ? "engine" : "prototype"; }
export async function generateMetadata() { return META[await site()]; }
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }) {
  const which = await site();
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('sipc-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}" }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Nav site={which} />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="footer"><div>
          <span>A product case study about Groww, not affiliated with Groww. Sample data only. Information, not investment advice: <a href="https://investor.sebi.gov.in" target="_blank" rel="noopener">investor.sebi.gov.in</a></span>
        </div></footer>
      </body>
    </html>
  );
}
