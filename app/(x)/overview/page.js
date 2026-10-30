import { Suspense } from "react";
import Overview from "./Overview";
export const metadata = { title: "Overview · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Overview /></Suspense>; }
