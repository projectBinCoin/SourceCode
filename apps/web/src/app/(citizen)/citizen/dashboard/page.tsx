"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCitizenTransactions, useRequests, useBins } from "@/lib/hooks/queries";
import { PointsBalanceCard } from "@/components/citizen/points-balance-card";
import { ActiveRequestBanner } from "@/components/citizen/active-request-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Recycle, ArrowRight, History, Plus, Sparkles } from "lucide-react";
import { WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { MyBinsCard } from "@/components/bins/my-bins-card";

export default function CitizenDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [] } = useCitizenTransactions(user?.id || "");
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
  const activeRequest = requests.find(
    (r) => r.citizenId === user?.id && (r.status === "pending" || r.status === "claimed")
  );
  const activeBin = activeRequest ? bins.find((b) => b.id === activeRequest.binId) : undefined;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="bg-brand-radial min-h-screen">
      <div className="w-full space-y-6 p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Manage your recyclable waste and earn rewards.</p>
        </motion.div>

        <PointsBalanceCard totalPoints={totalPoints} />

      {activeRequest && <ActiveRequestBanner request={activeRequest} bin={activeBin} />}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="overflow-hidden border-[#0099FF]/20 bg-gradient-to-br from-[#003B73]/8 via-card to-[#0099FF]/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sapphire-gradient shadow-lg glow-primary">
                <Recycle className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-semibold">Request a Recyclable Pickup</p>
                <p className="text-sm text-muted-foreground">
                  Turn your waste into reward points
                </p>
              </div>
            </div>
            <Link href="/citizen/book-pickup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 glow-primary sm:w-auto">
                <Plus className="h-4 w-4" /> Book Pickup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      <MyBinsCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" /> Recent Transactions
            </CardTitle>
            <CardDescription>Your latest recycling rewards</CardDescription>
          </div>
          <Link href="/citizen/wallet">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-center text-sm text-muted-foreground">
                No transactions yet. Book a pickup to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((txn, i) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-[#0099FF]/8 bg-card p-3 transition-colors hover:border-[#0099FF]/20 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-lg">{WASTAGE_META[txn.wastageType].icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{txn.wastageType} • {txn.fillPct}% fill</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(txn.date, "MMM d, yyyy")} • {txn.collectorName}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${txn.points > 0 ? "text-primary" : "text-destructive"}`}>
                    {txn.points > 0 ? "+" : ""}{Math.round(txn.points).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
