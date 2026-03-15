resource "azurerm_static_web_app" "plant_agent" {
  name                = "plant-agent-app"
  resource_group_name = azurerm_resource_group.plant_agent.name
  location            = azurerm_resource_group.plant_agent.location
  sku_tier            = "Free"
  sku_size            = "Free"
  lifecycle {
    ignore_changes = [
      repository_url,
      repository_branch
    ]
  }
}

locals {
  front_app_dns_name = "plant"
}

resource "azurerm_dns_cname_record" "plant_agent" {
  name                = local.front_app_dns_name
  zone_name           = local.infra.dns_zone_name
  resource_group_name = local.infra.resource_group_name
  ttl                 = 3600
  record              = azurerm_static_web_app.plant_agent.default_host_name
}

resource "azurerm_static_web_app_custom_domain" "plant_agent" {
  static_web_app_id = azurerm_static_web_app.plant_agent.id
  domain_name       = "${local.front_app_dns_name}.${local.infra.dns_zone_name}"
  validation_type   = "cname-delegation"
  depends_on        = [azurerm_dns_cname_record.plant_agent]
}
