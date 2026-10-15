"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCitizenTransactions, useVouchers } from "@/lib/hooks/queries";
import { useRedeemVoucher } from "@/lib/hooks/mutations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Search, Gift, QrCode } from "lucide-react";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import type { Voucher } from "@/types";
import { PointsBalanceCard } from "@/components/citizen/points-balance-card";
import { formatLKR, pointsToLKR } from "@/lib/currency";
import { fmtDate } from "@/lib/dates";

export default function WalletPage() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [] } = useCitizenTransactions(user?.id || "");
  const { data: vouchers = [] } = useVouchers();
  const redeemVoucher = useRedeemVoucher();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showQR, setShowQR] = useState(false);

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
  const earnedPoints = transactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0);
  const redeemedPoints = transactions.filter((t) => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0);

  const filteredTxns = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.collectorName.toLowerCase().includes(q) ||
      t.wastageType.toLowerCase().includes(q) ||
      (t.voucherName?.toLowerCase().includes(q) ?? false);
    const matchesType =
      filterType === "all" || (t.kind !== "redeem" && t.wastageType === filterType);
    return matchesSearch && matchesType;
  });

  const handleRedeem = (voucher: Voucher) => {
    if (totalPoints < voucher.costPoints || voucher.stock === 0) return;
    redeemVoucher(voucher.id, user?.id || "");
    setSelectedVoucher(voucher);
    setShowQR(true);
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground">Track your points and redeem rewards.</p>
      </div>

      <PointsBalanceCard totalPoints={totalPoints} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-[#0099FF]/10 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sapphire-gradient shadow-sm">
                <Coins className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">{earnedPoints.toLocaleString()} pts</p>
                <p className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(earnedPoints))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#0099FF]/10 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0055A4] to-[#0066C5] shadow-sm">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Redeemed</p>
                <p className="text-xl font-bold">{redeemedPoints.toLocaleString()} pts</p>
                <p className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(redeemedPoints))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>All your recycling transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by type or collector..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v || "all")}>
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WASTAGE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Fill %</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Collector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm">{fmtDate(txn.date, "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {txn.kind === "redeem" ? (
                          <span className="flex items-center gap-1">
                            🎁 <span className="text-muted-foreground">{txn.voucherName || "Voucher"}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            {WASTAGE_META[txn.wastageType].icon} {txn.wastageType}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{txn.kind === "redeem" ? "—" : `${txn.fillPct}%`}</TableCell>
                      <TableCell className={`text-right font-bold ${txn.points > 0 ? "text-primary" : "text-destructive"}`}>
                        {txn.points > 0 ? "+" : ""}{Math.round(txn.points).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{txn.collectorName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voucher Catalog</CardTitle>
          <CardDescription>Redeem your points for rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((voucher) => {
              const canAfford = totalPoints >= voucher.costPoints;
              return (
                <Card key={voucher.id} className={`border-[#0099FF]/10 transition-all hover:border-[#0099FF]/30 ${!canAfford ? "opacity-60" : "hover:shadow-lg"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{voucher.name}</p>
                        <Badge variant="secondary" className="mt-1">{voucher.category}</Badge>
                      </div>
                      <span className="text-xl">{voucher.category === "Mobile Data" ? "📱" : voucher.category === "Supermarket" ? "🛒" : "⚡"}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 font-bold text-primary">
                          <Coins className="h-4 w-4" /> {voucher.costPoints} pts
                        </span>
                        <span className="text-xs text-muted-foreground">≈ {formatLKR(pointsToLKR(voucher.costPoints))}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{voucher.stock} left</span>
                    </div>
                    <Button
                      className="mt-3 w-full gap-2"
                      size="sm"
                      disabled={!canAfford || voucher.stock === 0}
                      onClick={() => handleRedeem(voucher)}
                      variant={canAfford ? "default" : "outline"}
                    >
                      <QrCode className="h-4 w-4" />
                      {canAfford ? "Redeem" : "Not Enough Points"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Voucher Redeemed!</DialogTitle>
            <DialogDescription className="text-center">
              {selectedVoucher?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedVoucher && (
              <div className="rounded-xl border-2 border-[#0099FF]/30 bg-white p-4 shadow-lg">
                <QRCodeSVG
                  value={selectedVoucher.qrPayload}
                  size={200}
                  level="M"
                />
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Show this QR code at the partner outlet to claim your reward.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQR(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
