import { create } from "zustand";
import type { Bin, Collector, PickupRequest, Settings, Transaction, Voucher } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { generateId } from "@/lib/points";

/**
 * Synchronous client cache over the Supabase backend. Initial state is empty;
 * queries hydrate it from Supabase (see lib/hooks/queries.ts) and mutations
 * update it optimistically before persisting (see lib/hooks/mutations.ts).
 */
interface DataState {
  bins: Bin[];
  requests: PickupRequest[];
  transactions: Transaction[];
  vouchers: Voucher[];
  collectors: Collector[];
  settings: Settings;

  addBin: (bin: Omit<Bin, "id" | "batteryPct" | "airGapCm" | "lastPingAt">) => Bin;
  submitBin: (bin: Omit<Bin, "id" | "batteryPct" | "airGapCm" | "lastPingAt" | "approvalStatus"> & { submittedBy: string }) => Bin;
  approveBin: (binId: string) => void;
  rejectBin: (binId: string) => void;
  updateBinFill: (binId: string, fillPct: number) => void;
  refreshBinPing: (binId: string) => void;

  createRequest: (req: Omit<PickupRequest, "id" | "createdAt" | "status">) => PickupRequest;
  claimRequest: (requestId: string, collectorId: string) => void;
  completeRequest: (
    requestId: string,
    data: {
      observedFillPct: number;
      actualWastageType?: import("@/types").WastageType;
      driverComment?: string;
      photoRef?: string;
      pointsAwarded: number;
      mismatchFlag?: boolean;
      invalidFlag?: boolean;
    }
  ) => void;

  redeemVoucher: (voucherId: string, citizenId: string) => void;
  addVoucher: (voucher: Omit<Voucher, "id">) => Voucher;
  updateVoucher: (voucherId: string, updates: Partial<Voucher>) => void;
  deleteVoucher: (voucherId: string) => void;

  approveCollector: (collectorId: string) => void;
  rejectCollector: (collectorId: string) => void;
  suspendCollector: (collectorId: string) => void;
  reactivateCollector: (collectorId: string) => void;

  updateSettings: (settings: Partial<Settings>) => void;
}

export const useDataStore = create<DataState>()((set, get) => ({
  bins: [],
  requests: [],
  transactions: [],
  vouchers: [],
  collectors: [],
  settings: DEFAULT_SETTINGS,

  addBin: (bin) => {
    const newBin: Bin = {
      ...bin,
      id: generateId("bin"),
      batteryPct: Math.floor(Math.random() * 30) + 70,
      airGapCm: Math.round((100 - bin.fillPct) * 0.8),
      lastPingAt: new Date().toISOString(),
      approvalStatus: "approved",
    };
    set((s) => ({ bins: [...s.bins, newBin] }));
    return newBin;
  },

  submitBin: (bin) => {
    const newBin: Bin = {
      ...bin,
      id: generateId("bin"),
      batteryPct: Math.floor(Math.random() * 30) + 70,
      airGapCm: Math.round((100 - bin.fillPct) * 0.8),
      lastPingAt: new Date().toISOString(),
      approvalStatus: "pending",
      submittedAt: new Date().toISOString(),
    };
    set((s) => ({ bins: [...s.bins, newBin] }));
    return newBin;
  },

  approveBin: (binId) => {
    set((s) => ({
      bins: s.bins.map((b) =>
        b.id === binId ? { ...b, approvalStatus: "approved" } : b
      ),
    }));
  },

  rejectBin: (binId) => {
    set((s) => ({
      bins: s.bins.map((b) =>
        b.id === binId ? { ...b, approvalStatus: "rejected" } : b
      ),
    }));
  },

  updateBinFill: (binId, fillPct) => {
    set((s) => ({
      bins: s.bins.map((b) =>
        b.id === binId
          ? {
              ...b,
              fillPct,
              airGapCm: Math.round((100 - fillPct) * 0.8),
              lastPingAt: new Date().toISOString(),
            }
          : b
      ),
    }));
  },

  refreshBinPing: (binId) => {
    set((s) => ({
      bins: s.bins.map((b) =>
        b.id === binId
          ? {
              ...b,
              lastPingAt: new Date().toISOString(),
              batteryPct: Math.min(100, b.batteryPct + Math.floor(Math.random() * 3)),
            }
          : b
      ),
    }));
  },

  createRequest: (req) => {
    const newReq: PickupRequest = {
      ...req,
      id: generateId("req"),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ requests: [newReq, ...s.requests] }));
    return newReq;
  },

  claimRequest: (requestId, collectorId) => {
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "claimed",
              collectorId,
              claimedAt: new Date().toISOString(),
            }
          : r
      ),
    }));
  },

  completeRequest: (requestId, data) => {
    const req = get().requests.find((r) => r.id === requestId);
    if (!req) return;

    const collector = get().collectors.find((c) => c.id === req.collectorId);

    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "collected",
              collectedAt: new Date().toISOString(),
              observedFillPct: data.observedFillPct,
              actualWastageType: data.actualWastageType,
              driverComment: data.driverComment,
              photoRef: data.photoRef,
              pointsAwarded: data.pointsAwarded,
              mismatchFlag: data.mismatchFlag,
              invalidFlag: data.invalidFlag,
            }
          : r
      ),
      transactions: [
        {
          id: generateId("txn"),
          citizenId: req.citizenId,
          requestId: req.id,
          date: new Date().toISOString(),
          wastageType: data.actualWastageType || req.wastageType,
          fillPct: data.observedFillPct,
          points: data.pointsAwarded,
          collectorName: collector?.name || "Unknown",
          kind: "earn" as const,
        },
        ...s.transactions,
      ],
      collectors: s.collectors.map((c) =>
        c.id === req.collectorId
          ? {
              ...c,
              totalJobs: c.totalJobs + 1,
              penaltyCount: c.penaltyCount + (data.invalidFlag ? 1 : 0),
            }
          : c
      ),
    }));
  },

  redeemVoucher: (voucherId, citizenId) => {
    const voucher = get().vouchers.find((v) => v.id === voucherId);
    if (!voucher || voucher.stock <= 0) return;

    const balance = get()
      .transactions.filter((t) => t.citizenId === citizenId)
      .reduce((sum, t) => sum + t.points, 0);
    if (balance < voucher.costPoints) return;

    set((s) => ({
      vouchers: s.vouchers.map((v) =>
        v.id === voucherId ? { ...v, stock: v.stock - 1 } : v
      ),
      transactions: [
        {
          id: generateId("txn"),
          citizenId,
          requestId: voucherId,
          date: new Date().toISOString(),
          wastageType: "Plastic" as const,
          fillPct: 0,
          points: -voucher.costPoints,
          collectorName: "Voucher Redemption",
          kind: "redeem" as const,
          voucherName: voucher.name,
        },
        ...s.transactions,
      ],
    }));
  },

  addVoucher: (voucher) => {
    const newVoucher: Voucher = { ...voucher, id: generateId("vou") };
    set((s) => ({ vouchers: [...s.vouchers, newVoucher] }));
    return newVoucher;
  },

  updateVoucher: (voucherId, updates) => {
    set((s) => ({
      vouchers: s.vouchers.map((v) => (v.id === voucherId ? { ...v, ...updates } : v)),
    }));
  },

  deleteVoucher: (voucherId) => {
    set((s) => ({ vouchers: s.vouchers.filter((v) => v.id !== voucherId) }));
  },

  approveCollector: (collectorId) => {
    set((s) => ({
      collectors: s.collectors.map((c) =>
        c.id === collectorId ? { ...c, status: "approved" } : c
      ),
    }));
  },

  rejectCollector: (collectorId) => {
    set((s) => ({
      collectors: s.collectors.filter((c) => c.id !== collectorId),
    }));
  },

  suspendCollector: (collectorId) => {
    set((s) => ({
      collectors: s.collectors.map((c) =>
        c.id === collectorId ? { ...c, status: "suspended" } : c
      ),
    }));
  },

  reactivateCollector: (collectorId) => {
    set((s) => ({
      collectors: s.collectors.map((c) =>
        c.id === collectorId ? { ...c, status: "approved" } : c
      ),
    }));
  },

  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }));
  },
}));
