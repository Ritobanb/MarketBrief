import { ProviderInstrument } from "../lib/instruments";

export interface InstrumentProvider {
  readonly name: string;
  readonly minimumExpectedRecords: number;
  fetchCatalogue(): Promise<ProviderInstrument[]>;
}

/** Keep the first record when two source files describe the same listing. */
export function uniqueInstruments(records: ProviderInstrument[]) {
  const instruments = new Map<string, ProviderInstrument>();
  for (const record of records) {
    if (!instruments.has(record.providerSymbol)) instruments.set(record.providerSymbol, record);
  }
  return [...instruments.values()];
}
