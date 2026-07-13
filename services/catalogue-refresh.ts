import { ASSET_TYPES, ProviderInstrument } from "../lib/instruments";
import { CatalogueStore, RefreshInProgressError } from "../db/catalogue";
import { InstrumentProvider } from "../providers/instrument-provider";

export function validateCatalogue(records: ProviderInstrument[], minimumRecords: number) {
  if (!Array.isArray(records) || records.length < minimumRecords) throw new Error(`Provider returned ${records?.length || 0} records; expected at least ${minimumRecords}.`);
  const seen = new Set<string>();
  records.forEach((record, index) => {
    const required = [record.symbol, record.name, record.exchange, record.country, record.currency, record.providerSymbol];
    if (required.some(value => typeof value !== "string" || !value.trim())) throw new Error(`Invalid required field in provider record ${index + 1}.`);
    if (!ASSET_TYPES.includes(record.assetType)) throw new Error(`Invalid asset type in provider record ${index + 1}.`);
    if (!/^[A-Z]{3}$/.test(record.currency)) throw new Error(`Invalid currency in provider record ${index + 1}.`);
    if (seen.has(record.providerSymbol)) throw new Error(`Duplicate provider symbol: ${record.providerSymbol}.`);
    seen.add(record.providerSymbol);
  });
}

export async function refreshCatalogue(store: CatalogueStore, provider: InstrumentProvider) {
  const attemptedAt = new Date();
  try {
    const records = await provider.fetchCatalogue();
    validateCatalogue(records, provider.minimumExpectedRecords);
    await store.replaceFromProvider(records, attemptedAt);
    return await store.getStatus();
  } catch (error) {
    if (!(error instanceof RefreshInProgressError)) {
      await store.recordFailure(error instanceof Error ? error.message : "Unknown catalogue refresh error", attemptedAt);
    }
    throw error;
  }
}
