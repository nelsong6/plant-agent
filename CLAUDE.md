# plant-agent

Plant monitoring system: Raspberry Pi + camera captures photos of houseplants, uploads to Azure Blob Storage, web app for browsing photos, logging care actions, and AI-powered plant health insights via Claude.

## Architecture

- `pi/` — Python FastAPI service on Raspberry Pi 5 (Camera Module 3 + Arducam B0283 pan-tilt bracket)
- `frontend/` — Vite + React 19 + TypeScript + Tailwind CSS v4, hosted on Azure Static Web App (plants.romaine.life)
- `backend/` — Node.js Express API on AKS. Serves `/api/*` route factories from `backend/routes/` (plants, events, photos, capture, analysis, tasks, chat, push, notify) and Microsoft OAuth under `/auth/*`
- `snapshot/` — SQLite snapshot generator (Node 20). Queries Cosmos DB + Blob Storage, writes `.db` file consumed by the frontend via sql.js/WASM. Runs every 4 hours via GitHub Actions cron
- `tofu/` — OpenTofu infrastructure (resource group, blob storage, Cosmos DB, Container App, Static Web App)
- `enclosure/` — 3D-printable enclosure for Pi 5 + Arducam B0283 pan-tilt camera. Parametric OpenSCAD source files plus a CadQuery Python script (`enclosure_cadquery.py`) that generates STEP files (B-Rep solids) for import into Fusion 360, SolidWorks, FreeCAD, etc.

## Key Decisions

- Pi networking: Cloudflare Tunnel (pi.romaine.life → localhost:8420)
- Photo upload: Backend proxies — Pi returns JPEG bytes, backend uploads to blob via shared managed identity
- Managed identity: User-assigned `infra-shared-identity` from infra-bootstrap, pre-configured with Cosmos, App Config, Key Vault, and Storage roles
- Auth: Microsoft Sign-In via MSAL.js redirect flow with self-signed JWT. Any Microsoft account can log in; owner (`nelson-devops-project@outlook.com`) gets `admin` role, all others get `viewer` role. No login page — nav Sign In button (Microsoft-branded) redirects straight to Microsoft. AuthContext handles MSAL redirect response on any route, prepends `API_BASE` to login POST, exposes `isAdmin` helper. Backend verifies Microsoft ID tokens via JWKS. Microsoft Client ID read from shared plain App Config key (`microsoft_oauth_client_id_plain`). Local dev requires `frontend/.env.local` with `VITE_MICROSOFT_CLIENT_ID` and `VITE_API_BASE`. Public view-only access for browsing plants, photos, events, tasks, and analyses. Admin required for management actions (CRUD, logging events, chat, capture, analysis triggers). Viewers see amber "view-only privileges" banner and write UI is hidden
- Database: Cosmos DB PlantAgentDB in shared infra-cosmos (free tier). Containers: `plants` (/id), `events` (/plantId), `analyses` (/plantId), `chats` (/plantId), `rooms` (/id)
- AI: Claude claude-3-haiku via Anthropic API for plant enrichment (vision-based species ID on creation), analysis, and chat. Model constrained by API key access — currently `claude-3-haiku-20240307`
- Agentic capture: Backend endpoint orchestrates Claude tool-use loop with Pi HTTP API
- Snapshot system: Backend Container App scales to zero causing 30s+ cold starts. A GitHub Actions cron (`snapshot.yml`, every 4 hours) generates a SQLite snapshot from Cosmos DB + Blob Storage and commits it to the repo (`frontend/public/snapshot.db`). Frontend loads it via sql.js (WASM) for anonymous visitors — reads served entirely in-browser with zero backend dependency. Authenticated users discard the snapshot and switch to the live API. Follows the same pattern as kill-me's snapshot system. Key files: `snapshot/generate-snapshot.js` (generator), `frontend/src/api/snapshot.ts` (query functions mirroring API shapes), `frontend/src/api/snapshotContext.tsx` (`SnapshotProvider`, `useDataSource` hook). `staticwebapp.config.json` excludes `/snapshot.db` and `/sql-wasm.wasm` from the SWA navigation fallback so missing files return 404 (not index.html). WASM binary self-hosted via Vite plugin (no CDN). **Critical `useDataSource()` contract:** every consumer MUST check `isReady` before calling any fetch function. The snapshot loads asynchronously (WASM init + network fetch); until ready, `db` is null and `isLive` is true, causing fetches to silently hit the live API (which doesn't exist for anonymous users → permanent loading spinner). Pattern: `const { fetchPlants, isReady } = useDataSource(); useEffect(() => { if (!isReady) return; fetchPlants()... }, [isReady]);`
