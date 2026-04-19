resource "azurerm_resource_group" "plant_agent" {
  name     = "plant-agent-rg"
  location = var.location
}

# App identity used for hostname (plants.romaine.life), App Configuration
# key prefix, and the MS OAuth redirect URI. One source of truth so renaming
# the app's external identity is a one-line change.
locals {
  front_app_dns_name = "plants"
}
