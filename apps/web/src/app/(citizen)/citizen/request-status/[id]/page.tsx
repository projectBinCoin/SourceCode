import RequestStatusClient from "./request-status-client";

// Static export can't enumerate request ids — emit one placeholder page and
// let the _redirects rule serve it for every /citizen/request-status/* path.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <RequestStatusClient />;
}
