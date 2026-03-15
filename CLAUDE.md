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
- Auth: Microsoft Sign-In via MSAL.js redirect flow with self-signed JWT. Any Microsoft account can log in; owner (`nelson-devops-project@outlook.com`) gets `admin` role, all others get `viewer` role. No login page — nav Sign In button (Microsoft-branded) redirects straight to Microsoft. AuthContext handles MSAL redirect response on any route, prepends `API_BASE` to login POST, exposes `isAdmin` helper. Backend verifies Microsoft ID tokens via JWKS. Microsoft Client ID read from shared plain App Config key (`microsoft_oauth_client_id_plain`). Local dev requires `frontend/.env.local` with `VITE_MICROSOFT_CLIENT_ID` and `VITE_API_BASE`. Public view-only access for browsing plants, photos, events, tasks, and analyses. Admin required for management actions (CRUD, logging events, chat, capture, analysis triggers). Viewers see amber "view-only privileges" banner and write UI is hidden
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
- **2026-03-15** — Fix black screen on plants.romaine.life (two issues): (1) `API_BASE` in `frontend/src/api/client.ts` was empty, so production API calls hit the SWA origin instead of `plants.api.romaine.life` — fixed by reading `VITE_API_BASE` env var, added `.env.production` and CI build env. (2) SWA deploy action with `skip_app_build: true` was serving the source `index.html` (referencing `/src/main.tsx`) instead of the built output — fixed by changing `app_location` from `./frontend` to `./frontend/dist`. Also excluded `/api/*` from SWA navigation fallback.
- **2026-03-15** — Switch auth from Google Sign-In to Microsoft via MSAL.js. Frontend: replaced Google Identity Services with `@azure/msal-browser` redirect flow, removed LoginPage component and `/login` route — nav Sign In button calls `loginWithMicrosoft()` directly, AuthContext handles redirect response on any route. Backend: replaced `google-auth-library` with `jwks-rsa` for Microsoft ID token verification via JWKS endpoint, reads Microsoft Client ID from shared plain App Config key (`microsoft_oauth_client_id_plain`) instead of per-app Key Vault secret. CI: `VITE_MICROSOFT_CLIENT_ID` injected from GitHub Actions variable (set by infra-bootstrap). Removed `google-routes.js`, `LoginPage.tsx`, Google type declarations.
- **2026-03-15** — Add view-only mode for non-owner users. Backend: any Microsoft account can now log in (no longer 403 for unknown emails); owner email gets `admin` role, all others get `viewer` role. Added admin-only guards to POST events and POST chat routes. Frontend: `useAuth()` exposes `isAdmin` boolean, AppShell shows amber "view-only privileges" banner for non-admin users, PlantDetail hides LogAction and ChatPanel for viewers.
- **2026-03-15** — Restyle Sign In button to follow Microsoft branding guidelines: white bg with border, four-color Microsoft logo SVG, "Sign in with Microsoft" text, dark mode variant. Added `cursor-pointer` to shared Button component.
- **2026-03-15** — Fix local dev auth: AuthContext login POST now prepends `API_BASE` (was hitting Vite dev server instead of backend). Created `frontend/.env.local` with `VITE_MICROSOFT_CLIENT_ID` and `VITE_API_BASE` for local dev, added to `.gitignore`. Fixed `APP_CONFIG_PREFIX` in `backend/.env` from `plant` to `plants` (keys in App Config use plural prefix). Changed admin account from `fullnelsongrip@gmail.com` to `nelson-devops-project@outlook.com`.
