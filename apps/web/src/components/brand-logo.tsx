import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white",
        className
      )}
    >
      <Image
        src="/brand/logo.jpg"
        alt="Bincoin logo"
        width={1600}
        height={1600}
        unoptimized
        loading="eager"
        className="h-full w-full scale-150 object-contain"
      />
    </span>
  );
}
