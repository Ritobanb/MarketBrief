import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProviderInstrument } from "../lib/instruments";
import { InstrumentProvider } from "./instrument-provider";

export class MockInstrumentProvider implements InstrumentProvider {
  readonly name = "local-mock";
  readonly minimumExpectedRecords = 10;

  constructor(private readonly filePath = path.join(process.cwd(), "data", "mock-instruments.json")) {}

  async fetchCatalogue(): Promise<ProviderInstrument[]> {
    return JSON.parse(await readFile(this.filePath, "utf8")) as ProviderInstrument[];
  }
}
