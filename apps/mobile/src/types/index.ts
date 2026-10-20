export type Role = "citizen" | "collector" | "admin";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type WastageType =
  | "Plastic"
  | "Paper"
  | "Glass"
  | "Metal"
  | "Food Waste"
  | "Iron"
  | "Cardboard"
  | "Electronic";

export type BinSize = 20 | 100 | 240;

export type RequestStatus = "pending" | "claimed" | "collected" | "rejected";

export type CollectorStatus = "pending" | "approved" | "suspended";

export type VoucherCategory = "Mobile Data" | "Supermarket" | "Utility";

export type BinApprovalStatus = "approved" | "pending" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  tier?: Tier;
}

export interface Bin {
  id: string;
  deviceId: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
  sizeL: BinSize;
  fillPct: number;
  batteryPct: number;
  airGapCm: number;
  lastPingAt: string;
  isPublic: boolean;
  region: string;
  wasteType: WastageType;
  citizenId?: string;
  approvalStatus?: BinApprovalStatus;
  submittedBy?: string;
  submittedAt?: string;
  /** Secret the device must present to write telemetry (printed on the QR sticker). */
  pairingCode?: string;
  /** Inside height measured by the sensor itself during setup calibration. */
  binHeightCm?: number;
  calibratedAt?: string;
  recalibrateRequested?: boolean;
  /** Set by a DB trigger: 'urgent' when fill >= 80%. */
  priority?: "normal" | "urgent";
}

export interface PickupRequest {
  id: string;
  citizenId: string;
  binId: string;
  wastageType: WastageType;
  preferredSlot: string;
  notes?: string;
  /** Set by a DB trigger: 'urgent' when the bin is at >= 80% fill. */
  priority?: "normal" | "urgent";
  status: RequestStatus;
  collectorId?: string;
  createdAt: string;
  claimedAt?: string;
  collectedAt?: string;
  fillAtRequest?: number;
  observedFillPct?: number;
  actualWastageType?: WastageType;
  driverComment?: string;
  photoRef?: string;
  pointsAwarded?: number;
  mismatchFlag?: boolean;
  invalidFlag?: boolean;
}

export interface Transaction {
  id: string;
  citizenId: string;
  requestId: string;
  date: string;
  wastageType: WastageType;
  fillPct: number;
  points: number;
  collectorName: string;
  /** "redeem" rows are voucher redemptions (negative points), "earn" are pickups. */
  kind?: "earn" | "redeem";
  voucherName?: string;
}

export interface Voucher {
  id: string;
  name: string;
  category: VoucherCategory;
  costPoints: number;
  stock: number;
  qrPayload: string;
}

export interface Collector {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: CollectorStatus;
  totalJobs: number;
  penaltyCount: number;
  joinedAt: string;
  avatarUrl: string;
  lat: number;
  lng: number;
}

export interface Settings {
  basePointCaps: Record<BinSize, number>;
  multipliers: Record<WastageType, number>;
}

export interface PointCalcResult {
  points: number;
  capped: boolean;
  raw: number;
}
