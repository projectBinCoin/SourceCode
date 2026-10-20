export const queryKeys = {
  bins: () => ["bins"] as const,
  bin: (id: string) => ["bins", id] as const,
  requests: () => ["requests"] as const,
  request: (id: string) => ["requests", id] as const,
  transactions: () => ["transactions"] as const,
  citizenTransactions: (citizenId: string) => ["transactions", "citizen", citizenId] as const,
  vouchers: () => ["vouchers"] as const,
  collectors: () => ["collectors"] as const,
  settings: () => ["settings"] as const,
  users: () => ["users"] as const,
  announcedDevices: () => ["announcedDevices"] as const,
};
