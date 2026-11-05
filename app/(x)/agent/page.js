import { Suspense } from "react";
import Agent from "./Agent";
export const metadata = { title: "Evidence Research Assistant · SIP Discovery Engine" };
export default function Page() { return <Suspense fallback={<div className="x-page"><div className="x-skel" /></div>}><Agent /></Suspense>; }
