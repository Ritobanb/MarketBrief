import { CatalogueStore } from "../db/catalogue";
import { createPrismaClient } from "../db/prisma";
import { MockInstrumentProvider } from "../providers/mock-provider";
import { refreshCatalogue } from "../services/catalogue-refresh";

const prisma = createPrismaClient();
const store = new CatalogueStore(prisma);

try {
  await refreshCatalogue(store, new MockInstrumentProvider());
} finally {
  await store.close();
}
