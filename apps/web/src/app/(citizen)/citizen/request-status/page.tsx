import { Suspense } from "react";
import RequestStatusClient from "./request-status-client";

// Static export: the request id travels as ?id=<requestId> so the page is a
// real static file — no host rewrites needed, and client navigation never 404s.
export default function Page() {
  return (
    <Suspense>
      <RequestStatusClient />
    </Suspense>
  );
}
