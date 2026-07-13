import { CYCLE_TYPES, type CycleType } from "../lib/briefing";
import { createPrismaClient } from "../db/prisma";
import { BriefCycleRunner } from "../services/briefing/cycle-runner";
import { MockBriefGenerationAdapter, MockMarketDataAdapter } from "../services/briefing/mock-adapters";

const cycleType = process.argv[2] as CycleType;
if (!CYCLE_TYPES.includes(cycleType)) throw new Error(`Cycle type must be one of: ${CYCLE_TYPES.join(", ")}.`);
const scheduledFor = process.argv[3] ? new Date(process.argv[3]) : new Date();
const prisma = createPrismaClient();

try {
  const cycle = await new BriefCycleRunner(prisma, new MockMarketDataAdapter(), new MockBriefGenerationAdapter()).run(cycleType, scheduledFor);
  console.log(`Brief cycle ${cycle.id}: ${cycle.status}, ${cycle.llmCallCount} generation call(s).`);
} finally {
  await prisma.$disconnect();
}
