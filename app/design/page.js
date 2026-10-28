import { headers } from "next/headers";
import Design from "./Design";
export const metadata = { title: "Design", description: "Clickable Figma prototypes and the design file." };
export default async function Page() { const site = (await headers()).get("x-site") === "engine" ? "engine" : "prototype"; return <Design site={site} />; }
