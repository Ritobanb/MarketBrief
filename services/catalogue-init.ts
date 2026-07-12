import { getCatalogueStore } from "../db/catalogue";
import { MockInstrumentProvider } from "../providers/mock-provider";
import { refreshCatalogue } from "./catalogue-refresh";

let initialization: Promise<void> | undefined;

export function ensureCatalogue() {
  initialization ??= (async () => {
    const store = getCatalogueStore();
    if (store.count() === 0) await refreshCatalogue(store, new MockInstrumentProvider());
  })();
  return initialization;
}
