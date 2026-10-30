import { Suspense } from "react";
import Quality from "./Quality";
export const metadata = { title: "AI Quality · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Quality /></Suspense>; }
