export const ASSET_TYPES = ["Stock", "ETF", "Index", "Fund"] as const;

export type AssetType = typeof ASSET_TYPES[number];

export type ProviderInstrument = {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  assetType: AssetType;
  currency: string;
  isActive: boolean;
  providerSymbol: string;
};

export type Instrument = ProviderInstrument & {
  instrumentId: string;
  lastUpdatedAt: string;
};

export type CatalogueRefreshStatus = {
  status: "never" | "success" | "failed";
  lastAttemptedAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  lastError: string | null;
  activeCount: number;
  inactiveCount: number;
};
