"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TierBadge } from "./tier-badge";
import { getTierFromPoints } from "@/lib/constants";
import { Coins, TrendingUp } from "lucide-react";
import { formatLKR, pointsToLKR } from "@/lib/currency";

interface PointsBalanceCardProps {
  totalPoints: number;
}

export function PointsBalanceCard({ totalPoints }: PointsBalanceCardProps) {
  const [displayPoints, setDisplayPoints] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = totalPoints - start;
    if (diff === 0) return;

    const duration = 1000;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = totalPoints;
    };

    requestAnimationFrame(tick);
  }, [totalPoints]);

  const tier = getTierFromPoints(totalPoints);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="gradient-border overflow-hidden">
        <Card className="border-0 bg-gradient-to-br from-[#003B73]/10 via-card to-[#0099FF]/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Total Points Balance
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sapphire-gradient shadow-md">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-4xl font-bold tracking-tight">
                    {displayPoints.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  ≈ {formatLKR(pointsToLKR(totalPoints))} • Earn more by recycling
                </p>
              </div>
              <TierBadge tier={tier} />
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
