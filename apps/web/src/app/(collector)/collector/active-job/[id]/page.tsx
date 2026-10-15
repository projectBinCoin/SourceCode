import ActiveJobClient from "./active-job-client";

// Static export can't enumerate job ids — emit one placeholder page and let
// the _redirects rule serve it for every /collector/active-job/* path.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <ActiveJobClient />;
}
