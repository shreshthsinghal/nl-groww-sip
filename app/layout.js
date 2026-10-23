import "./globals.css";
import "./companion/companion.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "SIP Continuation · Groww case study",
  description: "Why first-time SIPs end without anyone deciding to stop them: an AI discovery engine, an eval-gated companion MVP, and live metrics.",
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Nav />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="footer"><div>
          <span>An independent product case study about Groww. Not affiliated with or endorsed by Groww.</span>
          <span>Sample data only. Information, not investment advice. Learn more at <a href="https://investor.sebi.gov.in" target="_blank" rel="noopener">investor.sebi.gov.in</a></span>
        </div></footer>
      </body>
    </html>
  );
}
