# ============================================================================
# Azure Blob Storage — Plant Photos
# ============================================================================

resource "azurerm_storage_account" "plant_photos" {
  name                     = "plantagentphotos"
  resource_group_name      = azurerm_resource_group.plant_agent.name
  location                 = azurerm_resource_group.plant_agent.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    cors_rule {
      allowed_origins    = ["*"]
      allowed_methods    = ["GET"]
      allowed_headers    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}

resource "azurerm_storage_container" "photos" {
  name                  = "photos"
  storage_account_id    = azurerm_storage_account.plant_photos.id
  container_access_type = "blob"
}

# Grant Container App managed identity write access to blob storage
resource "azurerm_role_assignment" "container_app_storage_contributor" {
  scope                = azurerm_storage_account.plant_photos.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_container_app.plant_agent_api["plant-agent-api"].identity[0].principal_id
}

# Lifecycle policy: cool after 30 days, delete after 1 year
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.plant_photos.id

  rule {
    name    = "archive-old-photos"
    enabled = true
    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["photos/"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than       = 365
      }
    }
  }
}
