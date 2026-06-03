# plant-agent (retired)

Plant monitoring system formerly at plants.romaine.life. Retired 2026-05-16; no longer in use.

Tofu in this repo destroys all per-app Azure resources (resource group, Cosmos DB, storage account, workload identity, role assignments, KV secrets). The shared infra-bootstrap entries for plant-agent (module.app and k8s_apps) are removed in nelsong6/infra-bootstrap. The repo will be archived once both applies land.

Migration history (for reference if anything similar comes up): the app was mid-migration to auth.romaine.life delegation when it was retired — see [plant-agent#23](https://github.com/nelsong6/plant-agent/pull/23) and [romaine-life/auth#16](https://github.com/romaine-life/auth/issues/16).
