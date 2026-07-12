import type { ProviderInstrument } from "../lib/instruments";
import { FinanceDatabaseProvider } from "./finance-database-provider";
import { InstrumentProvider, uniqueInstruments } from "./instrument-provider";
import { NasdaqTraderProvider } from "./nasdaq-trader-provider";

export class FreeGlobalProvider implements InstrumentProvider {
  readonly name = "free-global-bulk-catalogue";
  readonly minimumExpectedRecords = 10_000;

  async fetchCatalogue(): Promise<ProviderInstrument[]> {
    const [unitedStates, international] = await Promise.all([
      new NasdaqTraderProvider().fetchCatalogue(),
      new FinanceDatabaseProvider().fetchCatalogue(),
    ]);
    return uniqueInstruments([...unitedStates, ...international]);
  }
}
