import { getCatalogueStore } from "../db/catalogue";
import { createInstrumentProvider } from "../providers";
import { refreshCatalogue } from "../services/catalogue-refresh";

const status = await refreshCatalogue(getCatalogueStore(), createInstrumentProvider());
console.log(`Catalogue refreshed: ${status.activeCount} active, ${status.inactiveCount} inactive.`);
