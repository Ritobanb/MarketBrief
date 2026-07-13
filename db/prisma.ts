import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const localDatabaseUrl = "postgresql://marketbrief:marketbrief@localhost:5432/marketbrief";

export function createPrismaClient(databaseUrl = process.env.DATABASE_URL || localDatabaseUrl) {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in production.");
  const schema = new URL(databaseUrl).searchParams.get("schema") || undefined;
  const configuredPoolSize = Number(process.env.DATABASE_POOL_MAX || 10);
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: Number.isInteger(configuredPoolSize) && configuredPoolSize > 0 ? configuredPoolSize : 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    options: schema ? `-c search_path=${schema},public` : undefined,
  }, { schema });
  return new PrismaClient({ adapter });
}

export function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
