"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Trash2, ArrowRight } from "lucide-react";
import type { PickupRequest, Bin } from "@/types";

interface ActiveRequestBannerProps {
  request: PickupRequest | null;
  bin?: Bin;
}

export function ActiveRequestBanner({ request, bin }: ActiveRequestBannerProps) {
  if (!request) return null;

  const statusConfig = {
    pending: { label: "Pending Nearby Collectors", color: "from-amber-500 to-amber-600", badge: "text-amber-600 border-amber-500/30" },
    claimed: { label: "Claimed by Driver", color: "from-[#0066C5] to-[#0099FF]", badge: "text-[#0099FF] border-[#0099FF]/30" },
    collected: { label: "Collected & Points Awarded", color: "from-green-500 to-green-600", badge: "text-green-600 border-green-500/30" },
    rejected: { label: "Rejected", color: "from-red-500 to-red-600", badge: "text-red-600 border-red-500/30" },
  };

  const config = statusConfig[request.status];

  return (
    <Card className="border-[#0099FF]/20 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.color} shadow-md`}>
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Active Pickup Request</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={config.badge}>
                  {config.label}
                </Badge>
                {bin && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {bin.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link href={`/citizen/request-status?id=${request.id}`} className="shrink-0">
            <Button size="sm" variant="ghost" className="gap-1">
              Track <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
