"use client";

import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-gradient p-4">
      <BrandLogo className="h-20 w-20 rounded-2xl shadow-2xl" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">You&apos;re Offline</h1>
        <p className="mt-2 text-[#E0E0E0]/70">
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
