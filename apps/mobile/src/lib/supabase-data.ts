import { getSupabase } from "./supabase";
import type {
  Bin,
  Collector,
  PickupRequest,
  Settings,
  Transaction,
  User,
  Voucher,
} from "@/types";

type Row = Record<string, unknown>;

/**
 * Supabase persistence layer.
 *
 * Strategy: the Zustand data-store is the synchronous client cache, while
 * Supabase is the shared backend. Reads prefer Supabase and fall back to the
 * local cache when Supabase is unconfigured or unreachable. Writes update the
 * local store synchronously and are persisted to Supabase asynchronously.
 */

const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function toRow(obj: Record<string, unknown>): Row {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [camelToSnake(k), v ?? null])
  );
}

function fromRow<T>(row: Row): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [snakeToCamel(k), v])
  ) as T;
}

// ─── Reads ───────────────────────────────────────────────────
// Each returns null when Supabase should not be used (unconfigured, error,
// or empty/unseeded) so callers fall back to local store data.

async function fetchRows<T>(table: string): Promise<T[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(table).select("*");
  if (error || !data || data.length === 0) return null;
  return data.map((r: Row) => fromRow<T>(r as Row));
}

async function fetchRowById<T>(table: string, id: string): Promise<T | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow<T>(data as Row);
}

export const fetchBins = () => fetchRows<Bin>("bins");
export const fetchRequests = () => fetchRows<PickupRequest>("pickup_requests");
export const fetchRequest = (id: string) => fetchRowById<PickupRequest>("pickup_requests", id);
export const fetchVouchers = () => fetchRows<Voucher>("vouchers");
export const fetchCollectors = () => fetchRows<Collector>("collectors");

export async function fetchCitizenTransactions(citizenId: string): Promise<Transaction[] | null> {
  const sb = getSupabase();
  if (!sb || !citizenId) return null;
  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .eq("citizen_id", citizenId)
    .order("date", { ascending: false });
  if (error || !data || data.length === 0) return null;
  return data.map((r: Row) => fromRow<Transaction>(r as Row));
}

export async function fetchSettings(): Promise<Settings | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return fromRow<Settings>(data as Row);
}

export async function fetchUsers(): Promise<User[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("app_users").select("*");
  if (error || !data || data.length === 0) return null;
  return data.map((r: Row) => fromRow<User>(r as Row));
}

export async function fetchUserProfile(
  userId: string
): Promise<(User & { collectorProfile?: Collector }) | null> {
  const sb = getSupabase();
  if (!sb || !userId) return null;
  const [{ data: profile, error: pErr }, { data: collector, error: cErr }] = await Promise.all([
    sb.from("app_users").select("*").eq("id", userId).maybeSingle(),
    sb.from("collectors").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (pErr || cErr || !profile) return null;
  return {
    ...fromRow<User>(profile as Row),
    collectorProfile: collector ? fromRow<Collector>(collector as Row) : undefined,
  };
}

// Legacy rows may carry a client-generated id that differs from the auth
// user id — the unique(email) constraint then makes upserts 409. Look the
// profile up by email so existing rows get adopted instead of re-inserted.
export async function fetchUserProfileByEmail(
  email: string
): Promise<(User & { collectorProfile?: Collector }) | null> {
  const sb = getSupabase();
  if (!sb || !email) return null;
  const { data: profile, error } = await sb
    .from("app_users").select("*").eq("email", email).maybeSingle();
  if (error || !profile) return null;
  const { data: collector } = await sb
    .from("collectors").select("*").eq("user_id", (profile as Row).id as string).maybeSingle();
  return {
    ...fromRow<User>(profile as Row),
    collectorProfile: collector ? fromRow<Collector>(collector as Row) : undefined,
  };
}

// ─── Writes ──────────────────────────────────────────────────
// Full-row upserts read back from the store after each local mutation, so
// these are idempotent and always send the complete current state.

async function upsertRow(table: string, row: Row): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(table).upsert(row);
  if (error) throw error;
}

async function updateRow(table: string, id: string | number, patch: Row): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(table).update(toRow(patch)).eq("id", id);
  if (error) throw error;
}

/**
 * Atomic claim: the UPDATE only matches while the job is still pending, so
 * when two collectors race, exactly one gets the row back. Returns
 * "claimed" | "taken" (someone else won) | an error message.
 */
export async function claimRequestRow(requestId: string, collectorId: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return "claimed";                    // offline/demo: local store only
  const { data, error } = await sb
    .from("pickup_requests")
    .update({ status: "claimed", collector_id: collectorId, claimed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id");
  if (error) return error.message;
  return data && data.length > 0 ? "claimed" : "taken";
}

export const updateBinRow = (binId: string, patch: Row) => updateRow("bins", binId, patch);
export const updateRequestRow = (requestId: string, patch: Row) => updateRow("pickup_requests", requestId, patch);
export const updateVoucherRow = (voucherId: string, patch: Row) => updateRow("vouchers", voucherId, patch);
export const updateCollectorRow = (collectorId: string, patch: Row) => updateRow("collectors", collectorId, patch);
export const updateSettingsRow = (patch: Row) => updateRow("settings", 1, patch);

export async function fetchCollectorById(collectorId: string): Promise<Collector | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("collectors").select("*").eq("id", collectorId).maybeSingle();
  if (error || !data) return null;
  return fromRow<Collector>(data as Row);
}

async function deleteRow(table: string, id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

export const persistBin = (bin: Bin) => upsertRow("bins", toRow(bin as unknown as Row));

// PostgREST batch upserts union the keys of all rows: rows missing a key get
// NULL instead of the column default, so NOT NULL flags must always be sent.
function normalizeRequest(req: PickupRequest): PickupRequest {
  return { ...req, mismatchFlag: req.mismatchFlag ?? false, invalidFlag: req.invalidFlag ?? false };
}

export const persistRequest = (req: PickupRequest) =>
  upsertRow("pickup_requests", toRow(normalizeRequest(req) as unknown as Row));
export const persistTransaction = (txn: Transaction) =>
  upsertRow("transactions", toRow(txn as unknown as Row));
export const persistVoucher = (v: Voucher) => upsertRow("vouchers", toRow(v as unknown as Row));
export const deleteVoucherRow = (id: string) => deleteRow("vouchers", id);
export const deleteCollectorRow = (id: string) => deleteRow("collectors", id);

// ─── Device announce / claim (zero-typing bin setup) ──────────────────

export interface AnnouncedDevice {
  deviceId: string;
  binHeightCm: number | null;
  lastSeenAt: string;
}

export async function fetchAnnouncedDevices(): Promise<AnnouncedDevice[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("list_announced_devices");
  if (error || !data) return null;
  return (data as Row[]).map((r) => ({
    deviceId: r.device_id as string,
    binHeightCm: (r.bin_height_cm as number | null) ?? null,
    lastSeenAt: r.last_seen_at as string,
  }));
}

// Collection proof: collector's photo lands in the pickup-photos bucket;
// the public URL is stored on the request and shown to citizen + admin.
export async function uploadPickupPhoto(uri: string, requestId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const blob = await (await fetch(uri)).blob();
  const path = `${requestId}/${Date.now()}.jpg`;
  const { error } = await sb.storage.from("pickup-photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) return null;
  return sb.storage.from("pickup-photos").getPublicUrl(path).data.publicUrl;
}

export interface ClaimDeviceArgs {
  deviceId: string;
  pairingCode: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
  sizeL: number;
  region: string;
  wasteType: string;
}

export async function claimDevice(
  args: ClaimDeviceArgs
): Promise<{ ok: boolean; binId?: string; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "offline" };
  const { data, error } = await sb.rpc("claim_device", {
    p_device_id: args.deviceId,
    p_pairing_code: args.pairingCode,
    p_label: args.label,
    p_lat: args.lat,
    p_lng: args.lng,
    p_address: args.address,
    p_size_l: args.sizeL,
    p_region: args.region,
    p_waste_type: args.wasteType,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok?: boolean; bin_id?: string; error?: string } | null;
  return { ok: !!r?.ok, binId: r?.bin_id, error: r?.error };
}
