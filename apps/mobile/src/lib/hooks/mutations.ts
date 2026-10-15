"use client";

import { useDataStore } from "@/lib/store/data-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { Bin, PickupRequest, Voucher, WastageType, Transaction } from "@/types";
import {
  persistBin,
  persistRequest,
  persistTransaction,
  persistVoucher,
  deleteVoucherRow,
  deleteCollectorRow,
  updateBinRow,
  updateRequestRow,
  updateVoucherRow,
  updateCollectorRow,
  updateSettingsRow,
  fetchCollectorById,
  fetchRequest,
  fetchVouchers,
  fetchCitizenTransactions,
} from "@/lib/supabase-data";
import { generateId } from "@/lib/points";

/**
 * Mutations write to Supabase directly (targeted updates by row id) and then
 * invalidate the affected queries so the UI refetches fresh server data.
 * The Zustand store is also updated synchronously as the demo-mode fallback
 * when Supabase is unconfigured — but reads never depend on it.
 */

function persistAndSync(
  work: Promise<unknown>,
  qc: ReturnType<typeof useQueryClient>,
  keys: readonly (readonly unknown[])[]
) {
  work
    .then(() => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })))
    .catch((err) => console.warn("[bincoin] Supabase write failed — kept local data:", err));
}

export function useCreateRequest() {
  const createRequest = useDataStore((s) => s.createRequest);
  const qc = useQueryClient();

  return (input: {
    citizenId: string;
    binId: string;
    wastageType: WastageType;
    preferredSlot: string;
  }): PickupRequest => {
    const req = createRequest(input);
    persistAndSync(persistRequest(req), qc, [queryKeys.requests()]);
    return req;
  };
}

export function useClaimJob() {
  const claimRequest = useDataStore((s) => s.claimRequest);
  const qc = useQueryClient();

  return (requestId: string, collectorId: string) => {
    claimRequest(requestId, collectorId);
    persistAndSync(
      updateRequestRow(requestId, {
        status: "claimed",
        collectorId,
        claimedAt: new Date().toISOString(),
      }),
      qc,
      [queryKeys.requests()]
    );
  };
}

export function useCompleteJob() {
  const completeRequest = useDataStore((s) => s.completeRequest);
  const qc = useQueryClient();

  return (
    requestId: string,
    data: {
      observedFillPct: number;
      actualWastageType?: WastageType;
      driverComment?: string;
      photoRef?: string;
      pointsAwarded: number;
      mismatchFlag?: boolean;
      invalidFlag?: boolean;
    }
  ) => {
    completeRequest(requestId, data);
    const work = (async () => {
      const req = await fetchRequest(requestId);
      if (!req) throw new Error(`Request ${requestId} not found`);
      const collector = req.collectorId ? await fetchCollectorById(req.collectorId) : null;
      const txn: Transaction = {
        id: generateId("txn"),
        citizenId: req.citizenId,
        requestId: req.id,
        date: new Date().toISOString(),
        wastageType: data.actualWastageType || req.wastageType,
        fillPct: data.observedFillPct,
        points: data.pointsAwarded,
        collectorName: collector?.name || "Unknown",
        kind: "earn",
      };
      await Promise.all([
        updateRequestRow(requestId, {
          status: "collected",
          collectedAt: new Date().toISOString(),
          observedFillPct: data.observedFillPct,
          actualWastageType: data.actualWastageType,
          driverComment: data.driverComment,
          photoRef: data.photoRef,
          pointsAwarded: data.pointsAwarded,
          mismatchFlag: data.mismatchFlag ?? false,
          invalidFlag: data.invalidFlag ?? false,
        }),
        persistTransaction(txn),
        collector
          ? updateCollectorRow(collector.id, {
              totalJobs: collector.totalJobs + 1,
              penaltyCount: collector.penaltyCount + (data.invalidFlag ? 1 : 0),
            })
          : Promise.resolve(),
      ]);
    })();
    persistAndSync(work, qc, [
      queryKeys.requests(),
      queryKeys.transactions(),
      queryKeys.collectors(),
    ]);
  };
}

export function useRedeemVoucher() {
  const redeemVoucher = useDataStore((s) => s.redeemVoucher);
  const qc = useQueryClient();

  return (voucherId: string, citizenId: string) => {
    const work = (async () => {
      const voucher = (await fetchVouchers())?.find((v) => v.id === voucherId);
      if (!voucher || voucher.stock <= 0) throw new Error("Voucher unavailable");
      const txns = (await fetchCitizenTransactions(citizenId)) ?? [];
      const balance = txns.reduce((sum, t) => sum + t.points, 0);
      if (balance < voucher.costPoints) throw new Error("Insufficient points");
      const txn: Transaction = {
        id: generateId("txn"),
        citizenId,
        requestId: voucherId,
        date: new Date().toISOString(),
        wastageType: "Plastic",
        fillPct: 0,
        points: -voucher.costPoints,
        collectorName: "Voucher Redemption",
        kind: "redeem",
        voucherName: voucher.name,
      };
      await Promise.all([
        updateVoucherRow(voucherId, { stock: voucher.stock - 1 }),
        persistTransaction(txn),
      ]);
    })();
    redeemVoucher(voucherId, citizenId);
    persistAndSync(work, qc, [
      queryKeys.vouchers(),
      queryKeys.transactions(),
      queryKeys.citizenTransactions(citizenId),
    ]);
  };
}

export function useAddBin() {
  const addBin = useDataStore((s) => s.addBin);
  const qc = useQueryClient();

  return (bin: Omit<Bin, "id" | "batteryPct" | "airGapCm" | "lastPingAt">): Bin => {
    const newBin = addBin(bin);
    persistAndSync(persistBin(newBin), qc, [queryKeys.bins()]);
    return newBin;
  };
}

export function useSubmitBin() {
  const submitBin = useDataStore((s) => s.submitBin);
  const qc = useQueryClient();

  return (
    bin: Omit<Bin, "id" | "batteryPct" | "airGapCm" | "lastPingAt" | "approvalStatus"> & { submittedBy: string }
  ): Bin => {
    const newBin = submitBin(bin);
    persistAndSync(persistBin(newBin), qc, [queryKeys.bins()]);
    return newBin;
  };
}

export function useApproveBin() {
  const approveBin = useDataStore((s) => s.approveBin);
  const qc = useQueryClient();

  return (binId: string) => {
    approveBin(binId);
    persistAndSync(updateBinRow(binId, { approvalStatus: "approved" }), qc, [queryKeys.bins()]);
  };
}

export function useRejectBin() {
  const rejectBin = useDataStore((s) => s.rejectBin);
  const qc = useQueryClient();

  return (binId: string) => {
    rejectBin(binId);
    persistAndSync(updateBinRow(binId, { approvalStatus: "rejected" }), qc, [queryKeys.bins()]);
  };
}

export function useUpdateBinFill() {
  const updateBinFill = useDataStore((s) => s.updateBinFill);
  const qc = useQueryClient();

  return (binId: string, fillPct: number) => {
    updateBinFill(binId, fillPct);
    persistAndSync(
      updateBinRow(binId, {
        fillPct,
        airGapCm: Math.round((100 - fillPct) * 0.8),
        lastPingAt: new Date().toISOString(),
      }),
      qc,
      [queryKeys.bins()]
    );
  };
}

export function useRefreshBinPing() {
  const refreshBinPing = useDataStore((s) => s.refreshBinPing);
  const qc = useQueryClient();

  return (binId: string) => {
    refreshBinPing(binId);
    persistAndSync(updateBinRow(binId, { lastPingAt: new Date().toISOString() }), qc, [
      queryKeys.bins(),
    ]);
  };
}

/** Ask the device to re-run its empty-bin calibration on the next wake. */
export function useRequestRecalibration() {
  const qc = useQueryClient();
  return (binId: string) => {
    persistAndSync(updateBinRow(binId, { recalibrateRequested: true }), qc, [queryKeys.bins()]);
  };
}

export function useApproveCollector() {
  const approveCollector = useDataStore((s) => s.approveCollector);
  const qc = useQueryClient();

  return (collectorId: string) => {
    approveCollector(collectorId);
    persistAndSync(updateCollectorRow(collectorId, { status: "approved" }), qc, [
      queryKeys.collectors(),
    ]);
  };
}

export function useRejectCollector() {
  const rejectCollector = useDataStore((s) => s.rejectCollector);
  const qc = useQueryClient();

  return (collectorId: string) => {
    rejectCollector(collectorId);
    persistAndSync(deleteCollectorRow(collectorId), qc, [queryKeys.collectors()]);
  };
}

export function useSuspendCollector() {
  const suspendCollector = useDataStore((s) => s.suspendCollector);
  const qc = useQueryClient();

  return (collectorId: string) => {
    suspendCollector(collectorId);
    persistAndSync(updateCollectorRow(collectorId, { status: "suspended" }), qc, [
      queryKeys.collectors(),
    ]);
  };
}

export function useReactivateCollector() {
  const reactivateCollector = useDataStore((s) => s.reactivateCollector);
  const qc = useQueryClient();

  return (collectorId: string) => {
    reactivateCollector(collectorId);
    persistAndSync(updateCollectorRow(collectorId, { status: "approved" }), qc, [
      queryKeys.collectors(),
    ]);
  };
}

export function useUpdateSettings() {
  const updateSettings = useDataStore((s) => s.updateSettings);
  const qc = useQueryClient();

  return (settings: Partial<import("@/types").Settings>) => {
    updateSettings(settings);
    persistAndSync(updateSettingsRow(settings), qc, [queryKeys.settings()]);
  };
}

export function useAddVoucher() {
  const addVoucher = useDataStore((s) => s.addVoucher);
  const qc = useQueryClient();

  return (voucher: Omit<Voucher, "id">) => {
    const newVoucher = addVoucher(voucher);
    persistAndSync(persistVoucher(newVoucher), qc, [queryKeys.vouchers()]);
  };
}

export function useUpdateVoucher() {
  const updateVoucher = useDataStore((s) => s.updateVoucher);
  const qc = useQueryClient();

  return (voucherId: string, updates: Partial<Voucher>) => {
    updateVoucher(voucherId, updates);
    persistAndSync(updateVoucherRow(voucherId, updates), qc, [queryKeys.vouchers()]);
  };
}

export function useDeleteVoucher() {
  const deleteVoucher = useDataStore((s) => s.deleteVoucher);
  const qc = useQueryClient();

  return (voucherId: string) => {
    deleteVoucher(voucherId);
    persistAndSync(deleteVoucherRow(voucherId), qc, [queryKeys.vouchers()]);
  };
}
