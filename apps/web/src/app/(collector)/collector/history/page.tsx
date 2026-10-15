"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRequests, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, MapPin, MessageSquare, Camera, AlertTriangle, XCircle } from "lucide-react";
import { WASTAGE_META } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export default function CollectorHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const collector = collectors.find((c) => c.userId === user?.id);
  const myJobs = requests
    .filter((r) => r.collectorId === collector?.id && r.status === "collected")
    .sort((a, b) => new Date(b.collectedAt || "").getTime() - new Date(a.collectedAt || "").getTime());

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Collection History</h1>
        <p className="text-muted-foreground">Your completed pickup jobs</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-[#0099FF]/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{myJobs.length}</p>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card className="border-[#0099FF]/10 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">
              {Math.round(myJobs.reduce((sum, r) => sum + (r.pointsAwarded || 0), 0)).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Points Issued</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">
              {myJobs.filter((r) => r.invalidFlag).length}
            </p>
            <p className="text-xs text-muted-foreground">Penalties</p>
          </CardContent>
        </Card>
      </div>

      {myJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No completed jobs yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => {
            const bin = bins.find((b) => b.id === job.binId);
            return (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{WASTAGE_META[job.wastageType].icon}</span>
                        <span className="font-medium">{job.wastageType}</span>
                        {job.mismatchFlag && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Mismatch
                          </Badge>
                        )}
                        {job.invalidFlag && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" /> Invalid
                          </Badge>
                        )}
                      </div>
                      {bin && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {bin.label}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {job.collectedAt && fmtDate(job.collectedAt, "MMM d, yyyy 'at' HH:mm")}
                      </p>
                      {job.driverComment && (
                        <p className="text-sm mt-2 flex items-start gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          {job.driverComment}
                        </p>
                      )}
                      {job.photoRef && (
                        <p className="text-xs mt-1 flex items-center gap-1 text-muted-foreground">
                          <Camera className="h-3 w-3" /> Photo evidence captured
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">Fill: {job.observedFillPct}%</p>
                      <p className={`text-lg font-bold ${job.pointsAwarded! > 0 ? "text-primary" : "text-destructive"}`}>
                        {Math.round(job.pointsAwarded!)} pts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
