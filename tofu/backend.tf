# ============================================================================
# Azure Container App — Backend API
# ============================================================================

locals {
  back_app_dns_name = "${local.front_app_dns_name}.api"
}

data "azurerm_user_assigned_identity" "shared" {
  name                = "infra-shared-identity"
  resource_group_name = local.infra.resource_group_name
}

resource "azurerm_container_app" "plant_agent_api" {
  for_each                     = toset(["plant-agent-api"])
  name                         = each.key
  resource_group_name          = azurerm_resource_group.plant_agent.name
  container_app_environment_id = local.infra.container_app_environment_id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [local.infra.shared_identity_id]
  }

  template {
    container {
      name   = each.key
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "AZURE_CLIENT_ID"
        value = data.azurerm_user_assigned_identity.shared.client_id
      }

      env {
        name  = "AZURE_APP_CONFIG_ENDPOINT"
        value = local.infra.azure_app_config_endpoint
      }

      env {
        name  = "APP_CONFIG_PREFIX"
        value = local.front_app_dns_name
      }

      env {
        name  = "KEY_VAULT_URL"
        value = "https://${local.infra.key_vault_name}.vault.azure.net"
      }

      env {
        name  = "SWA_DEFAULT_HOSTNAME"
        value = azurerm_static_web_app.plant_agent.default_host_name
      }
    }

    min_replicas = 0
    max_replicas = 3
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }

    cors {
      allowed_origins = [
        "https://${azurerm_static_web_app.plant_agent.default_host_name}",
        "https://${local.front_app_dns_name}.${local.infra.dns_zone_name}",
        "http://localhost:3000",
        "http://localhost:5173"
      ]

      allowed_methods           = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
      allowed_headers           = ["*"]
      exposed_headers           = ["*"]
      max_age_in_seconds        = 3600
      allow_credentials_enabled = true
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}

# ============================================================================
# Custom Domain + Managed Certificate
# ============================================================================

# 1. Verification TXT record
resource "azurerm_dns_txt_record" "plant_agent_api_verification" {
  name                = "asuid.${local.back_app_dns_name}"
  zone_name           = local.infra.dns_zone_name
  resource_group_name = local.infra.resource_group_name
  ttl                 = 3600

  record {
    value = azurerm_container_app.plant_agent_api["plant-agent-api"].custom_domain_verification_id
  }
}

# 2. CNAME routing record
resource "azurerm_dns_cname_record" "plant_agent_api" {
  name                = local.back_app_dns_name
  zone_name           = local.infra.dns_zone_name
  resource_group_name = local.infra.resource_group_name
  ttl                 = 3600
  record              = azurerm_container_app.plant_agent_api["plant-agent-api"].ingress[0].fqdn
}

# 3a. Register custom domain (no cert yet)
resource "azurerm_container_app_custom_domain" "plant_agent_api" {
  name                     = "${local.back_app_dns_name}.${local.infra.dns_zone_name}"
  container_app_id         = azurerm_container_app.plant_agent_api["plant-agent-api"].id
  certificate_binding_type = "Disabled"

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }

  depends_on = [
    azurerm_dns_txt_record.plant_agent_api_verification,
    azurerm_dns_cname_record.plant_agent_api
  ]
}

# 3b. Azure Managed Certificate
resource "azapi_resource" "plant_agent_api_managed_cert" {
  type      = "Microsoft.App/ManagedEnvironments/managedCertificates@2024-03-01"
  name      = "plant-agent-api-cert"
  parent_id = local.infra.container_app_environment_id
  location  = var.location

  body = {
    properties = {
      subjectName             = "${local.back_app_dns_name}.${local.infra.dns_zone_name}"
      domainControlValidation = "CNAME"
    }
  }

  depends_on = [
    azurerm_container_app_custom_domain.plant_agent_api
  ]
}

# 3c. Bind managed certificate to custom domain
resource "azapi_update_resource" "plant_agent_api_cert_binding" {
  type        = "Microsoft.App/containerApps@2024-03-01"
  resource_id = azurerm_container_app.plant_agent_api["plant-agent-api"].id

  body = {
    properties = {
      configuration = {
        ingress = {
          customDomains = [
            {
              name          = "${local.back_app_dns_name}.${local.infra.dns_zone_name}"
              certificateId = azapi_resource.plant_agent_api_managed_cert.id
              bindingType   = "SniEnabled"
            }
          ]
        }
      }
    }
  }

  depends_on = [
    azapi_resource.plant_agent_api_managed_cert
  ]
}
