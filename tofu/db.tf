# Cosmos DB NoSQL Database (app-specific; account is managed by shared infra)
resource "azurerm_cosmosdb_sql_database" "plant_agent" {
  name                = "PlantAgentDB"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name

  lifecycle {
    ignore_changes = [throughput]
  }
}

resource "azurerm_cosmosdb_sql_container" "plants" {
  name                = "plants"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  database_name       = azurerm_cosmosdb_sql_database.plant_agent.name
  partition_key_paths = ["/id"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "events" {
  name                = "events"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  database_name       = azurerm_cosmosdb_sql_database.plant_agent.name
  partition_key_paths = ["/plantId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "analyses" {
  name                = "analyses"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  database_name       = azurerm_cosmosdb_sql_database.plant_agent.name
  partition_key_paths = ["/plantId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "chats" {
  name                = "chats"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  database_name       = azurerm_cosmosdb_sql_database.plant_agent.name
  partition_key_paths = ["/plantId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "rooms" {
  name                = "rooms"
  resource_group_name = local.infra.resource_group_name
  account_name        = local.infra.cosmos_db_account_name
  database_name       = azurerm_cosmosdb_sql_database.plant_agent.name
  partition_key_paths = ["/id"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}
