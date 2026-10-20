"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBins } from "@/lib/hooks/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditBinDialog } from "@/components/bins/edit-bin-dialog";
import { fmtFillPct } from "@/lib/dates";
import { getFillColor } from "@/lib/constants";
import { MapPin, Pencil, Plus } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "In review", cls: "text-amber-600 border-amber-500/40" },
  approved: { label: "Approved", cls: "text-green-600 border-green-500/40" },
  rejected: { label: "Rejected", cls: "text-red-600 border-red-500/40" },
};

/** The signed-in citizen's bins, each with a quick Edit action. */
export function MyBinsCard() {
  const user = useAuthStore((s) => s.user);
  const { data: bins = [] } = useBins();
  const [editingId, setEditingId] = useState<string | null>(null);

  const myBins = bins.filter((b) => b.submittedBy === user?.id || b.citizenId === user?.id);
  const editingBin = editingId ? myBins.find((b) => b.id === editingId) : undefined;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg">My Bins</CardTitle>
          <CardDescription>Edit details, location or height — edits go back to admin review</CardDescription>
        </div>
        <Link href="/citizen/register-bin">
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {myBins.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No bins registered yet.</p>
        ) : (
          <div className="space-y-2">
            {myBins.map((bin) => {
              const st = STATUS[bin.approvalStatus ?? "approved"];
              return (
                <div key={bin.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#0099FF]/8 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{bin.label}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-bold" style={{ color: getFillColor(bin.fillPct) }}>{fmtFillPct(bin.fillPct)}</span>
                        {" "}• {bin.sizeL}L • {bin.deviceId}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {st && <Badge variant="outline" className={st.cls}>{st.label}</Badge>}
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditingId(bin.id)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      {editingBin && (
        <EditBinDialog key={editingBin.id} bin={editingBin} open onOpenChange={(o) => !o && setEditingId(null)} />
      )}
    </Card>
  );
}
