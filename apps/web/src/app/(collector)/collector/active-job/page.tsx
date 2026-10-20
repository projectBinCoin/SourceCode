import { Suspense } from "react";
import ActiveJobClient from "./active-job-client";

// Static export: the job id travels as ?id=<jobId> so the page is a real
// static file — no host rewrites needed, and client navigation never 404s.
export default function Page() {
  return (
    <Suspense>
      <ActiveJobClient />
    </Suspense>
  );
}
