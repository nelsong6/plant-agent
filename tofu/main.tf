resource "azurerm_resource_group" "plant_agent" {
  name     = "plant-agent-rg"
  location = var.location
}
