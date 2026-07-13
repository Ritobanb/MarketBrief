# Morning Ledger

A Next.js market-brief signup and personalization experience with a local instrument catalogue.

## Development

Requires Node.js 24, pnpm 11, and Docker.

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm instruments:refresh
pnpm dev
```

The app is available at `http://localhost:3000`. Catalogue administration is available at `/admin/catalogue`.

## Subscriber persistence

Both the homepage signup and personalized setup save directly to PostgreSQL through `POST /api/subscriptions`. Email addresses are normalized and unique. Personalized preferences, notifications, and watchlist rows are written in one transaction, so partial profiles are never published. Repeated submissions update the same profile, while a later homepage signup never resets an existing personalized profile.

Validation runs in the browser for immediate feedback and again on the server as the source of truth. The API rejects malformed emails, unsupported preference values, inactive instruments, duplicate watchlist identifiers, oversized bodies, and cross-origin writes. Set `DATABASE_POOL_MAX` to match the connection budget of the production PostgreSQL service.

Production requires `DATABASE_URL` and should use a long random `CATALOGUE_REFRESH_SECRET`; catalogue refresh fails closed when that secret is absent. Apply migrations during deployment before starting the application.

The subscriber administration screen is available at `/admin/subscribers` and requires a database-backed administrator login. Create or rotate the root administrator without placing a password in source control:

```bash
ADMIN_ROOT_EMAIL=admin@example.com ADMIN_ROOT_PASSWORD='use-a-strong-password' pnpm db:seed:admin
```

Passwords use salted scrypt hashes. Successful login creates an eight-hour, HTTP-only, SameSite=Strict session cookie; logout and password rotation revoke active sessions. Five failed attempts temporarily lock the account. The screen supports search, pagination, insert, profile and notification updates, activation/deactivation, and permanent deletion.

## PostgreSQL instrument catalogue

- Prisma schema: `prisma/schema.prisma`
- PostgreSQL migration: `prisma/migrations/20260712000000_postgresql_catalogue/migration.sql`
- Local PostgreSQL: `docker-compose.yml`
- Free daily providers: Nasdaq Trader for US listings and FinanceDatabase exchange files for TSX, LSE, ASX, and NSE
- Offline mock provider: `providers/mock-provider.ts`
- Mock symbol list: `data/mock-instruments.json`
- Local search: `GET /api/instruments/search?q=nvda`
- Refresh status: `GET /api/admin/instruments/status`
- Refresh trigger: `POST /api/admin/instruments/refresh`

Searches use indexed PostgreSQL fields and `pg_trgm` partial matching. Exact tickers rank first, ticker prefixes second, and company or ETF names third. The API searches PostgreSQL only; it never contacts a provider while a user types.

The refresh validates the entire provider list before opening a transaction. A PostgreSQL advisory lock prevents overlapping jobs. The transaction stages the complete provider snapshot, adds new instruments, updates metadata, preserves stable instrument IDs, and marks missing records inactive. Any validation or transaction failure leaves the previous catalogue intact.

The default `global-free` adapter downloads Nasdaq Trader's official US symbol files plus the MIT-licensed FinanceDatabase files for Canada, the UK, Australia, and India. It requires no API key and makes no network request while a user searches. Set `INSTRUMENT_PROVIDER=mock` for fully offline development, `nasdaq` for US-only data, or `international-free` for the four international markets only.

For a scheduled deployed refresh, configure the repository secrets `CATALOGUE_REFRESH_URL` and `CATALOGUE_REFRESH_SECRET`. The included GitHub Actions workflow runs daily. Another provider can later implement the `InstrumentProvider` interface without changing search or refresh behavior.

## Brief generation pipeline

Each scheduled window has one durable `BriefCycle`. The runner collects and validates one market snapshot for every uniquely watched instrument, reserves the cycle's single generation call, stores one structured master brief, and renders all recipient communications deterministically. A database constraint prevents more than one generation call per cycle, and recipient idempotency keys prevent duplicate messages.

The current adapters are intentionally local mocks: they exercise snapshots, token/cost accounting, personalization, and delivery queuing without connecting an LLM, market-data API, or email provider. Replace the `MarketDataAdapter` and `BriefGenerationAdapter` implementations when providers are selected.

```bash
pnpm briefs:run daily 2026-07-13T11:00:00.000Z
```

Free-edition delivery times are fixed at 7:00 AM daily, 8:00 AM premarket, 4:30 PM market close, and 6:00 PM Sunday weekly recap. Delivery records retain each reader's time zone so a future batch dispatcher can send by time-zone window without creating per-user scheduled jobs.

## Importing the previous SQLite catalogue

Keep `data/instruments.db` until the import reports matching source and PostgreSQL counts:

```bash
pnpm db:import:sqlite data/instruments.db
```

The importer detects duplicate provider symbols or stable IDs, preserves every existing stable instrument ID, and verifies imported records before reporting success. It never deletes the SQLite file.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

CI starts PostgreSQL 17 as a service container, applies migrations, seeds the catalogue, and runs the complete validation suite.
