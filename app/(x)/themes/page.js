import { Suspense } from "react";
import Themes from "./Themes";
export const metadata = { title: "Insight Analysis · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Themes /></Suspense>; }
