# plant-agent

Plant monitoring system: Raspberry Pi + camera captures photos of houseplants, uploads to Azure Blob Storage, web app for browsing photos, logging care actions, and AI-powered plant health insights via Claude.

## Architecture

- `pi/` — Python FastAPI service on Raspberry Pi 5 (Camera Module 3 + Arducam B0283 pan-tilt bracket)
- `frontend/` — Vite + React 19 + TypeScript, hosted on Azure Static Web App (plant.romaine.life)
- `backend/` — Node.js Express API, hosted on Azure Container App (plant.api.romaine.life)
- `tofu/` — OpenTofu infrastructure (resource group, blob storage, Cosmos DB, Container App, Static Web App)

## Key Decisions

- Pi networking: Cloudflare Tunnel (pi.romaine.life → localhost:8420)
- Photo upload: Backend proxies — Pi returns JPEG bytes, backend uploads to blob via managed identity
- Auth: Local username/password with JWT (no Auth0). Public view-only access for browsing plants, photos, events, tasks, and analyses. Login required for management actions (CRUD, logging events, chat, capture, analysis triggers)
- Database: Cosmos DB PlantAgentDB in shared infra-cosmos (free tier)
- AI: Claude claude-sonnet-4-6 via Anthropic API for plant analysis and chat
- Agentic capture: Backend endpoint orchestrates Claude tool-use loop with Pi HTTP API

## Change Log

- **2026-03-14** — Initial scaffold: repo structure, tofu infra, GitHub Actions workflows, Pi FastAPI stubs, backend Express skeleton, frontend React scaffold
- **2026-03-14** — Deep implementations: PlantDetail view (PhotoTimeline, EventLog, LogAction), TaskQueue with backend computation, ChatPanel with Claude SSE streaming, PhotoBrowser, public/auth access split
