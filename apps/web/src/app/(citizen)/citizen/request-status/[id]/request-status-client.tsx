"use client";

import { useRequest, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Truck, ArrowLeft, MapPin, Trash2, Calendar } from "lucide-react";
import { WASTAGE_META } from "@/lib/constants";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function RequestStatusPage() {
  // Static export: the real request id is the last URL segment — the Pages
  // redirect serves this page for every /request-status/<id> path.
  const id = typeof window !== "undefined"
    ? window.location.pathname.split("/").filter(Boolean).pop() ?? ""
    : "";
  const { data: request } = useRequest(id);
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const bin = request ? bins.find((b) => b.id === request.binId) : undefined;
  const collector = request?.collectorId
    ? collectors.find((c) => c.id === request.collectorId)
    : undefined;

  if (!request) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Request not found.</p>
        <Link href="/citizen/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const steps = [
    {
      label: "Pending Nearby Collectors",
      icon: Clock,
      done: request.status === "claimed" || request.status === "collected",
      active: request.status === "pending",
    },
    {
      label: `Claimed by Driver${collector ? ` ${collector.name}` : ""}`,
      icon: Truck,
      done: request.status === "collected",
      active: request.status === "claimed",
    },
    {
      label: "Collected & Points Awarded",
      icon: Check,
      done: request.status === "collected",
      active: false,
    },
  ];

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <Link href="/citizen/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Request Status</h1>
        <p className="text-muted-foreground">Track your pickup request in real-time.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bin && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{bin.label}</span>
              <span className="text-muted-foreground">— {bin.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span>{WASTAGE_META[request.wastageType].icon} {request.wastageType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{request.preferredSlot}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
          <CardDescription>Live status of your pickup request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                        step.done && "border-primary bg-primary text-primary-foreground",
                        step.active && "border-primary text-primary",
                        !step.done && !step.active && "border-muted text-muted-foreground"
                      )}
                    >
                      {step.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </motion.div>
                    {i < steps.length - 1 && (
                      <div className={cn("mt-1 h-12 w-0.5", step.done ? "bg-primary" : "bg-muted")} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={cn("font-medium", step.done || step.active ? "" : "text-muted-foreground")}>
                      {step.label}
                    </p>
                    {step.active && (
                      <Badge variant="outline" className="mt-1 text-primary">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {request.status === "pending" && (
        <Card className="border-[#0099FF]/20 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Your request is visible to nearby collectors and will be claimed soon. You&apos;ll
              see live updates on this page.
            </p>
          </CardContent>
        </Card>
      )}

      {request.status === "claimed" && collector && (
        <Card className="border-[#0099FF]/20 bg-gradient-to-br from-[#0066C5]/8 to-[#0099FF]/5">
          <CardContent className="p-4">
            <p className="text-sm">
              <span className="font-medium">{collector.name}</span> has claimed your request and is on the way!
            </p>
          </CardContent>
        </Card>
      )}

      {request.status === "collected" && (
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/8 to-green-600/5">
          <CardContent className="p-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg"
            >
              <Check className="h-6 w-6 text-white" />
            </motion.div>
            <p className="font-medium">Pickup Completed!</p>
            {request.pointsAwarded !== undefined && (
              <p className="mt-1 text-2xl font-bold text-primary glow-text">
                +{request.pointsAwarded} points
              </p>
            )}
            <Link href="/citizen/wallet">
              <Button className="mt-3 glow-primary">View Wallet</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
