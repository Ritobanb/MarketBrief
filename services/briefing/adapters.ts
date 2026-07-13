import type { BriefSource, CycleType, GenerationUsage, MarketSnapshotPayload, MasterBriefContent, SnapshotInstrument } from "../../lib/briefing";

export interface MarketDataAdapter {
  readonly name: string;
  collect(cycleType: CycleType, instruments: SnapshotInstrument[]): Promise<{
    payload: MarketSnapshotPayload;
    sources: BriefSource[];
    warnings: string[];
  }>;
}

export interface BriefGenerationAdapter {
  readonly model: string;
  readonly promptVersion: string;
  generate(snapshot: MarketSnapshotPayload): Promise<{ content: MasterBriefContent; usage: GenerationUsage }>;
}
