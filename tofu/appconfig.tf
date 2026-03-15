# ============================================================================
# Azure App Configuration Key-Values
# ============================================================================
# Read at runtime by the backend via fetchAppConfig() in startup/appConfig.js.
# The Container App's managed identity has "App Configuration Data Reader"
# role assigned in backend.tf.

resource "azurerm_app_configuration_key" "cosmos_db_endpoint" {
  configuration_store_id = local.infra.azure_app_config_resource_id
  key                    = "${local.front_app_dns_name}/cosmos_db_endpoint"
  value                  = "https://${local.infra.cosmos_db_account_name}.documents.azure.com:443/"
}

resource "azurerm_app_configuration_key" "storage_account_endpoint" {
  configuration_store_id = local.infra.azure_app_config_resource_id
  key                    = "${local.front_app_dns_name}/storage_account_endpoint"
  value                  = azurerm_storage_account.plant_photos.primary_blob_endpoint
}
