"use client";

import { useCollectors, useRequests } from "@/lib/hooks/queries";
import { useApproveCollector, useRejectCollector, useSuspendCollector, useReactivateCollector } from "@/lib/hooks/mutations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Check, X, Clock, Briefcase, AlertTriangle } from "lucide-react";
import type { Collector } from "@/types";
import { fmtDate } from "@/lib/dates";

export default function AdminCollectorsPage() {
  const { data: collectors = [] } = useCollectors();
  const { data: requests = [] } = useRequests();
  const approveCollector = useApproveCollector();
  const rejectCollector = useRejectCollector();
  const suspendCollector = useSuspendCollector();
  const reactivateCollector = useReactivateCollector();

  const pending = collectors.filter((c) => c.status === "pending");
  const active = collectors.filter((c) => c.status === "approved" || c.status === "suspended");

  const getCollectorJobs = (collectorId: string) =>
    requests.filter((r) => r.collectorId === collectorId && r.status === "collected");

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Collector Management</h1>
        <p className="text-muted-foreground">Approve, monitor, and manage field collectors</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            Pending Approvals
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Active Collectors</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending approvals.</p>
              </CardContent>
            </Card>
          ) : (
            pending.map((collector) => (
              <CollectorCard
                key={collector.id}
                collector={collector}
                onApprove={() => approveCollector(collector.id)}
                onReject={() => rejectCollector(collector.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          {active.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No active collectors.</p>
              </CardContent>
            </Card>
          ) : (
            active.map((collector) => {
              const jobs = getCollectorJobs(collector.id);
              const penalties = jobs.filter((j) => j.invalidFlag).length;
              return (
                <Card key={collector.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src={collector.avatarUrl} alt={collector.name} />
                          <AvatarFallback>{collector.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{collector.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{collector.email}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant={collector.status === "approved" ? "default" : "secondary"}>
                              {collector.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Joined {fmtDate(collector.joinedAt, "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:ml-4 sm:shrink-0 sm:justify-end">
                        <div className="text-right">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> {collector.totalJobs}
                            </span>
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3 w-3" /> {penalties}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">jobs / penalties</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={collector.status === "approved"}
                            onCheckedChange={(checked) =>
                              checked
                                ? reactivateCollector(collector.id)
                                : suspendCollector(collector.id)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollectorCard({
  collector,
  onApprove,
  onReject,
}: {
  collector: Collector;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={collector.avatarUrl} alt={collector.name} />
              <AvatarFallback>{collector.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{collector.name}</p>
              <p className="truncate text-sm text-muted-foreground">{collector.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Applied {fmtDate(collector.joinedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Button size="sm" onClick={onApprove} className="flex-1 gap-1 sm:flex-initial">
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject} className="flex-1 gap-1 sm:flex-initial">
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
