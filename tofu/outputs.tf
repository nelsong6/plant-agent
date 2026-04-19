output "resource_group_name" {
  value       = azurerm_resource_group.plant_agent.name
  description = "Name of the resource group"
}

output "cosmos_db_database_name" {
  value       = azurerm_cosmosdb_sql_database.plant_agent.name
  description = "Cosmos DB database name"
}

output "cosmos_db_endpoint" {
  value       = "https://${local.infra.cosmos_db_account_name}.documents.azure.com:443/"
  description = "Cosmos DB endpoint URL"
}

output "storage_account_name" {
  value       = azurerm_storage_account.plant_photos.name
  description = "Name of the plant photos storage account"
}

output "storage_account_endpoint" {
  value       = azurerm_storage_account.plant_photos.primary_blob_endpoint
  description = "Primary blob endpoint for the plant photos storage account"
}
