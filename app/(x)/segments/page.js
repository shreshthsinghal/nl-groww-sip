import { Suspense } from "react";
import Segments from "./Segments";
export const metadata = { title: "Segment Explorer · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Segments /></Suspense>; }
