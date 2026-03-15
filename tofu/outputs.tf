output "resource_group_name" {
  value       = azurerm_resource_group.plant_agent.name
  description = "Name of the resource group"
}

output "static_web_app_name" {
  value       = azurerm_static_web_app.plant_agent.name
  description = "Name of the Azure Static Web App"
}

output "static_web_app_hostname" {
  value       = "${local.front_app_dns_name}.${local.infra.dns_zone_name}"
  description = "Custom domain hostname of the Static Web App"
}

output "cosmos_db_database_name" {
  value       = azurerm_cosmosdb_sql_database.plant_agent.name
  description = "Cosmos DB database name"
}

output "backend_api_url" {
  value       = "https://${local.back_app_dns_name}.${local.infra.dns_zone_name}"
  description = "The URL of the backend Container App API"
}

output "container_app_name" {
  value       = azurerm_container_app.plant_agent_api["plant-agent-api"].name
  description = "Name of the backend Container App"
}

output "container_app_default_fqdn" {
  value       = azurerm_container_app.plant_agent_api["plant-agent-api"].ingress[0].fqdn
  description = "Default Azure-assigned FQDN for the backend Container App"
}

output "storage_account_name" {
  value       = azurerm_storage_account.plant_photos.name
  description = "Name of the plant photos storage account"
}

output "storage_account_endpoint" {
  value       = azurerm_storage_account.plant_photos.primary_blob_endpoint
  description = "Primary blob endpoint for the plant photos storage account"
}
