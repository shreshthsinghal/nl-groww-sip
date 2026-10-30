import { Suspense } from "react";
import Methodology from "./Methodology";
export const metadata = { title: "Methodology · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Methodology /></Suspense>; }
