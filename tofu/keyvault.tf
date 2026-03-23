data "azurerm_key_vault" "main" {
  name                = local.infra.key_vault_name
  resource_group_name = local.infra.resource_group_name
}

resource "random_password" "jwt_signing_secret" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "jwt_signing_secret" {
  name         = "plant-agent-jwt-signing-secret"
  value        = random_password.jwt_signing_secret.result
  key_vault_id = data.azurerm_key_vault.main.id
}

resource "random_password" "notify_api_key" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "notify_api_key" {
  name         = "plant-agent-notify-api-key"
  value        = random_password.notify_api_key.result
  key_vault_id = data.azurerm_key_vault.main.id
}
