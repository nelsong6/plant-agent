# Per-app workload identity for plant-agent — replaces reuse of
# infra-shared-identity. Scoped to what backend/config.js + server.js
# actually call:
#   - Cosmos data on dbs/PlantAgentDB
#   - KV Secrets User on the 5 secrets config.js reads
#   - App Configuration Data Reader at store level (config.js reads
#     plants/cosmos_db_endpoint + plants/storage_account_endpoint)
#   - Storage Blob Data Contributor on the `photos` container in
#     `plantagentphotos`

data "azurerm_resource_group" "infra" {
  name = local.infra.resource_group_name
}

resource "azurerm_user_assigned_identity" "plant_agent" {
  name                = "plant-agent-identity"
  resource_group_name = data.azurerm_resource_group.infra.name
  location            = data.azurerm_resource_group.infra.location
}

resource "azurerm_cosmosdb_sql_role_assignment" "plant_agent_cosmos" {
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  role_definition_id  = "${local.infra.cosmos_db_account_id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_user_assigned_identity.plant_agent.principal_id
  scope               = "${local.infra.cosmos_db_account_id}/dbs/${azurerm_cosmosdb_sql_database.plant_agent.name}"
}

# Per-secret KV grants. config.js reads exactly these five at startup;
# new secrets require an additional role assignment here, not a widening
# to vault scope.
locals {
  plant_agent_kv_secrets = [
    "plant-agent-jwt-signing-secret",
    "plant-agent-anthropic-api-key",
    "plant-agent-vapid-public-key",
    "plant-agent-vapid-private-key",
    "plant-agent-notify-api-key",
  ]
}

resource "azurerm_role_assignment" "plant_agent_kv_secrets" {
  for_each             = toset(local.plant_agent_kv_secrets)
  scope                = "${data.azurerm_key_vault.main.id}/secrets/${each.key}"
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.plant_agent.principal_id
}

resource "azurerm_role_assignment" "plant_agent_appconfig" {
  scope                = local.infra.azure_app_config_resource_id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_user_assigned_identity.plant_agent.principal_id
}

resource "azurerm_role_assignment" "plant_agent_photos_blob" {
  scope                = azurerm_storage_container.photos.resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.plant_agent.principal_id
}

resource "azurerm_federated_identity_credential" "plant_agent" {
  name                = "aks-plant-agent"
  resource_group_name = local.infra.resource_group_name
  parent_id           = azurerm_user_assigned_identity.plant_agent.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = var.cluster_oidc_issuer_url
  subject             = "system:serviceaccount:plant-agent:infra-shared"
}

output "plant_agent_identity_client_id" {
  value       = azurerm_user_assigned_identity.plant_agent.client_id
  description = "Pin into k8s/serviceaccount.yaml's azure.workload.identity/client-id annotation."
}
