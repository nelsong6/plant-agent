import { AppConfigurationClient } from '@azure/app-configuration';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Fetches application configuration from Azure App Configuration and Key Vault.
 *
 * Environment variables consumed:
 *   AZURE_APP_CONFIG_ENDPOINT  – App Configuration endpoint URL
 *   APP_CONFIG_PREFIX          – key prefix (e.g. "plant")
 *   KEY_VAULT_URL              – Key Vault endpoint URL
 */
export async function fetchAppConfig() {
  const appConfigEndpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  if (!appConfigEndpoint) {
    throw new Error('AZURE_APP_CONFIG_ENDPOINT environment variable is not set.');
  }

  const prefix = process.env.APP_CONFIG_PREFIX;
  if (!prefix) {
    throw new Error('APP_CONFIG_PREFIX environment variable is not set.');
  }

  const keyVaultUrl = process.env.KEY_VAULT_URL;
  if (!keyVaultUrl) {
    throw new Error('KEY_VAULT_URL environment variable is not set.');
  }

  const credential = new DefaultAzureCredential();
  const appConfigClient = new AppConfigurationClient(appConfigEndpoint, credential);
  const kvClient = new SecretClient(keyVaultUrl, credential);

  // App Configuration: per-app values
  const [cosmosEndpointSetting, storageEndpointSetting] =
    await Promise.all([
      appConfigClient.getConfigurationSetting({ key: `${prefix}/cosmos_db_endpoint` }),
      appConfigClient.getConfigurationSetting({ key: `${prefix}/storage_account_endpoint` }),
    ]);

  // Key Vault: per-app secrets
  const [jwtSigningSecret, anthropicApiKey] = (
    await Promise.all([
      kvClient.getSecret('plant-agent-jwt-signing-secret'),
      kvClient.getSecret('plant-agent-anthropic-api-key').catch(() => ({ value: null })),
    ])
  ).map((s) => s.value);

  const config = {
    cosmosDbEndpoint: cosmosEndpointSetting.value,
    storageAccountEndpoint: storageEndpointSetting.value,
    jwtSigningSecret,
    anthropicApiKey,
  };

  const required = ['cosmosDbEndpoint', 'storageAccountEndpoint', 'jwtSigningSecret'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Configuration value "${key}" is missing or empty.`);
    }
  }

  if (!config.anthropicApiKey) {
    console.warn('[appConfig] Anthropic API key not found — AI chat will be unavailable');
  }

  console.log('[appConfig] Application config loaded from App Configuration + Key Vault');
  return config;
}
