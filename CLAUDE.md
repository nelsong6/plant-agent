# plant-agent

Plant monitoring system: Raspberry Pi + camera captures photos of houseplants, uploads to Azure Blob Storage, web app for browsing photos, logging care actions, and AI-powered plant health insights via Claude.

## Architecture

- `pi/` — Python FastAPI service on Raspberry Pi 5 (Camera Module 3 + Arducam B0283 pan-tilt bracket)
- `frontend/` — Vite + React 19 + TypeScript + Tailwind CSS v4, hosted on Azure Static Web App (plants.romaine.life)
- `backend/` — Node.js Express API, hosted on Azure Container App (plants.api.romaine.life)
- `tofu/` — OpenTofu infrastructure (resource group, blob storage, Cosmos DB, Container App, Static Web App)
- `enclosure/` — OpenSCAD parametric 3D-printable enclosure for Pi 5 + Arducam B0283 pan-tilt camera

## Key Decisions

- Pi networking: Cloudflare Tunnel (pi.romaine.life → localhost:8420)
- Photo upload: Backend proxies — Pi returns JPEG bytes, backend uploads to blob via shared managed identity
- Managed identity: User-assigned `infra-shared-identity` from infra-bootstrap, pre-configured with Cosmos, App Config, Key Vault, and Storage roles
- Auth: Google Sign-In (single allowed account: `fullnelsongrip@gmail.com`) with self-signed JWT. Public view-only access for browsing plants, photos, events, tasks, and analyses. Login required for management actions (CRUD, logging events, chat, capture, analysis triggers). Google Client ID stored in Key Vault (`plant-agent-google-client-id`)
- Database: Cosmos DB PlantAgentDB in shared infra-cosmos (free tier)
- AI: Claude claude-sonnet-4-6 via Anthropic API for plant analysis and chat
- Agentic capture: Backend endpoint orchestrates Claude tool-use loop with Pi HTTP API

## Change Log

- **2026-03-14** — Initial scaffold: repo structure, tofu infra, GitHub Actions workflows, Pi FastAPI stubs, backend Express skeleton, frontend React scaffold
- **2026-03-14** — Deep implementations: PlantDetail view (PhotoTimeline, EventLog, LogAction), TaskQueue with backend computation, ChatPanel with Claude SSE streaming, PhotoBrowser, public/auth access split
- **2026-03-14** — Switch Container App to shared user-assigned managed identity (infra-shared-identity) from infra-bootstrap; remove per-app role assignments for Cosmos, App Config, Key Vault, Storage
- **2026-03-14** — Add SWA navigation fallback config (`staticwebapp.config.json`), root `package.json` with `concurrently` for `npm run dev`, backend `.env` for local dev against real Azure resources, gitignore `*.tsbuildinfo` and root `node_modules/`
- **2026-03-14** — Frontend visual overhaul: added Tailwind CSS v4 (`@tailwindcss/vite`), custom "Greenhouse Modern" theme (leaf green + bark neutral palettes, Inter font) in `src/index.css`. Created 7 shared UI primitives in `src/components/ui/` (Card, Badge, Button, Skeleton, EmptyState, ErrorBanner, PageHeader). Replaced all inline `style={{}}` objects with Tailwind utility classes across every component. Added sticky nav with mobile hamburger, active-route highlighting, loading skeletons, proper empty states, responsive grid layouts, chat message bubbles with streaming dots, urgency-colored task cards, and a polished login page.
- **2026-03-14** — Replace local username/password auth with Google Sign-In. Frontend uses Google Identity Services (popup flow) on login page. Backend verifies Google ID token via `google-auth-library`, restricts access to single allowed email, upserts account in Cosmos DB, issues self-signed JWT. Removed `bcryptjs`, `local-routes.js`. Google Client ID stored in Key Vault (`plant-agent-google-client-id`).
- **2026-03-14** — Add dark mode with toggle. Created `ThemeContext` (`src/theme/ThemeContext.tsx`) using class-based dark mode strategy with localStorage persistence, defaulting to dark. Added sun/moon toggle button in navbar. Applied `dark:` Tailwind variants across all 17 component files (AppShell, UI primitives, page components). Configured `@custom-variant dark` in `index.css` for Tailwind v4.
- **2026-03-14** — Rename frontend DNS from `plant.romaine.life` to `plants.romaine.life` (and backend API to `plants.api.romaine.life`). Only the `front_app_dns_name` local in `tofu/frontend.tf` changed; all Azure resource names remain `plant-agent-*`.
- **2026-03-14** — Add `enclosure/` directory with OpenSCAD parametric 3D-printable enclosure. Two-piece design (base + top) housing Pi 5 with port cutouts/vents and a cylindrical turret for Arducam B0283 pan-tilt camera. Includes component library (`lib/`), assembly preview, and README with print settings/BOM/assembly instructions.
- **2026-03-14** — Fix black screen on plants.romaine.life: set `API_BASE` from `VITE_API_BASE` env var (was empty, causing API calls to hit the SWA instead of the backend). Added `.env.production`, CI build env var, and excluded `/api/*` from SWA navigation fallback.
- **2026-03-14** — Fix SWA deploy serving source `index.html` instead of built output: changed `app_location` from `./frontend` to `./frontend/dist` with `skip_app_build: true`.
