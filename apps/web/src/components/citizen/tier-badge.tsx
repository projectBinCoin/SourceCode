"use client";

import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/types";
import { motion } from "framer-motion";

const tierStyles: Record<Tier, string> = {
  Bronze: "bg-gradient-to-r from-amber-700 to-amber-600 text-amber-50 border-amber-600/30",
  Silver: "bg-gradient-to-r from-slate-400 to-slate-300 text-slate-50 border-slate-400/30",
  Gold: "bg-gradient-to-r from-yellow-500 to-amber-400 text-yellow-950 border-yellow-500/30",
  Platinum: "bg-gradient-to-r from-[#0066C5] to-[#0099FF] text-white border-[#0099FF]/30",
};

const tierIcons: Record<Tier, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
};

export function TierBadge({ tier, size = "default" }: { tier: Tier; size?: "sm" | "default" }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Badge
        className={`${tierStyles[tier]} gap-1 border shadow-md ${size === "sm" ? "text-xs" : ""}`}
        variant="secondary"
      >
        <span>{tierIcons[tier]}</span>
        {tier} Tier
      </Badge>
    </motion.div>
  );
}
