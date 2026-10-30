import { Suspense } from "react";
import Evidence from "./Evidence";
export const metadata = { title: "Evidence Explorer · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Evidence /></Suspense>; }
