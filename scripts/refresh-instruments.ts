import { getCatalogueStore } from "../db/catalogue";
import { createInstrumentProvider } from "../providers";
import { refreshCatalogue } from "../services/catalogue-refresh";

const store = getCatalogueStore();
try {
  const status = await refreshCatalogue(store, createInstrumentProvider());
  console.log(`Catalogue refreshed: ${status.activeCount} active, ${status.inactiveCount} inactive.`);
} finally {
  await store.close();
}
