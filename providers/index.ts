import type { InstrumentProvider } from "./instrument-provider";
import { MockInstrumentProvider } from "./mock-provider";
import { NasdaqTraderProvider } from "./nasdaq-trader-provider";
import { FinanceDatabaseProvider } from "./finance-database-provider";
import { FreeGlobalProvider } from "./free-global-provider";

const DEFAULT_PROVIDER = "global-free";

export function createInstrumentProvider(name = process.env.INSTRUMENT_PROVIDER || DEFAULT_PROVIDER): InstrumentProvider {
  switch (name) {
    case "mock": return new MockInstrumentProvider();
    case "nasdaq": return new NasdaqTraderProvider();
    case "international-free": return new FinanceDatabaseProvider();
    case "global-free": return new FreeGlobalProvider();
    default: throw new Error(`Unknown instrument provider: ${name}`);
  }
}
