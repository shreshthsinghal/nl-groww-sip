import { Suspense } from "react";
import Opportunities from "./Opportunities";
export const metadata = { title: "Opportunity Ranking · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Opportunities /></Suspense>; }
