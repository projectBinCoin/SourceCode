"use client";

import { useState } from "react";
import { useRequests, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, XCircle, Camera, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { WASTAGE_META, WASTAGE_TYPES } from "@/lib/constants";
import type { PickupRequest } from "@/types";
import { fmtDate } from "@/lib/dates";

export default function AdminAuditLogPage() {
  const { data: requests = [] } = useRequests();
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFlag, setFilterFlag] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedRequests = requests
    .filter((r) => r.status === "collected")
    .sort((a, b) => new Date(b.collectedAt || "").getTime() - new Date(a.collectedAt || "").getTime());

  const filtered = completedRequests.filter((r) => {
    const bin = bins.find((b) => b.id === r.binId);
    const collector = collectors.find((c) => c.id === r.collectorId);
    const matchesSearch =
      !search ||
      bin?.label.toLowerCase().includes(search.toLowerCase()) ||
      collector?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.driverComment?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || r.wastageType === filterType;
    const matchesFlag =
      filterFlag === "all" ||
      (filterFlag === "mismatch" && r.mismatchFlag) ||
      (filterFlag === "invalid" && r.invalidFlag) ||
      (filterFlag === "clean" && !r.mismatchFlag && !r.invalidFlag);
    return matchesSearch && matchesType && matchesFlag;
  });

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Master record of all completed collections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Collection Records</CardTitle>
          <CardDescription>{filtered.length} completed collections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bin, collector, or comment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v || "all")}>
              <SelectTrigger className="sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WASTAGE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFlag} onValueChange={(v) => setFilterFlag(v || "all")}>
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="mismatch">Mismatched</SelectItem>
                <SelectItem value="invalid">Invalid/Contaminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Fill</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((req) => {
                    const bin = bins.find((b) => b.id === req.binId);
                    const collector = collectors.find((c) => c.id === req.collectorId);
                    const isExpanded = expandedId === req.id;
                    return (
                      <AuditRow
                        key={req.id}
                        req={req}
                        binLabel={bin?.label || "Unknown"}
                        collectorName={collector?.name || "Unknown"}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : req.id)}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditRow({
  req,
  binLabel,
  collectorName,
  isExpanded,
  onToggle,
}: {
  req: PickupRequest;
  binLabel: string;
  collectorName: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="text-sm whitespace-nowrap">
          {req.collectedAt && fmtDate(req.collectedAt, "MMM d, yyyy")}
        </TableCell>
        <TableCell className="text-sm font-medium max-w-[150px] truncate">{binLabel}</TableCell>
        <TableCell>
          <span className="flex items-center gap-1">
            {WASTAGE_META[req.wastageType].icon} {req.wastageType}
          </span>
        </TableCell>
        <TableCell className="text-center">{req.observedFillPct}%</TableCell>
        <TableCell className={`text-right font-bold ${req.pointsAwarded! > 0 ? "text-primary" : "text-destructive"}`}>
          {Math.round(req.pointsAwarded!)}
        </TableCell>
        <TableCell className="text-sm">{collectorName}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            {req.mismatchFlag && (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                <AlertTriangle className="h-3 w-3 mr-1" /> Mismatch
              </Badge>
            )}
            {req.invalidFlag && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Invalid
              </Badge>
            )}
            {!req.mismatchFlag && !req.invalidFlag && (
              <Badge variant="outline" className="text-green-600 border-green-500">Clean</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30">
            <div className="space-y-2 py-2">
              {req.actualWastageType && req.actualWastageType !== req.wastageType && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Actual material: </span>
                  <span className="font-medium">{WASTAGE_META[req.actualWastageType].icon} {req.actualWastageType}</span>
                </p>
              )}
              {req.driverComment && (
                <p className="text-sm flex items-start gap-1">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Driver comment: </span>
                  <span>{req.driverComment}</span>
                </p>
              )}
              {req.photoRef && (
                <p className="text-sm flex items-center gap-1 text-muted-foreground">
                  <Camera className="h-3 w-3" /> Photo evidence ref: <span className="font-mono text-xs">{req.photoRef}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Request ID: <span className="font-mono">{req.id}</span>
              </p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
