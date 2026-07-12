# Morning Ledger

A Next.js market-brief signup and personalization experience with a local instrument catalogue.

## Development

Requires Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm instruments:refresh
pnpm dev
```

The app is available at `http://localhost:3000`. Catalogue administration is available at `/admin/catalogue`.

## Instrument catalogue

- SQLite migration: `db/migrations/0001_instrument_catalogue.sql`
- Free daily providers: Nasdaq Trader for US listings and FinanceDatabase exchange files for TSX, LSE, ASX, and NSE
- Offline mock provider: `providers/mock-provider.ts`
- Mock symbol list: `data/mock-instruments.json`
- Local search: `GET /api/instruments/search?q=nvda`
- Refresh status: `GET /api/admin/instruments/status`
- Refresh trigger: `POST /api/admin/instruments/refresh`

The refresh validates the entire provider list before opening a transaction. It adds new instruments, updates metadata, preserves existing internal IDs, and marks missing records inactive. Any validation or transaction failure leaves the previous catalogue intact.

The default `global-free` adapter downloads Nasdaq Trader's official US symbol files plus the MIT-licensed FinanceDatabase files for Canada, the UK, Australia, and India. It requires no API key and makes no network request while a user searches. Set `INSTRUMENT_PROVIDER=mock` for fully offline development, `nasdaq` for US-only data, or `international-free` for the four international markets only.

For a scheduled deployed refresh, configure the repository secrets `CATALOGUE_REFRESH_URL` and `CATALOGUE_REFRESH_SECRET`. The included GitHub Actions workflow runs daily. Another provider can later implement the `InstrumentProvider` interface without changing search or refresh behavior.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```
