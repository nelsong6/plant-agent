// Loads runtime config from Azure App Configuration + Key Vault at startup.
// Workload identity: the pod's ServiceAccount is federated to
// plant-agent-identity (tofu/identity.tf) with narrow Cosmos + KV + App
// Config + Storage grants.
import { AppConfigurationClient } from '@azure/app-configuration';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export async function fetchConfig() {
  const appConfigEndpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  const keyVaultUrl = process.env.KEY_VAULT_URL;
  if (!appConfigEndpoint) throw new Error('AZURE_APP_CONFIG_ENDPOINT unset');
  if (!keyVaultUrl) throw new Error('KEY_VAULT_URL unset');

  const credential = new DefaultAzureCredential();
  const appConfig = new AppConfigurationClient(appConfigEndpoint, credential);
  const kv = new SecretClient(keyVaultUrl, credential);

  const cosmosEndpoint = await appConfig.getConfigurationSetting({ key: 'plants/cosmos_db_endpoint' });
  const storageEndpoint = await appConfig.getConfigurationSetting({ key: 'plants/storage_account_endpoint' });

  // Per-app signing secret. Microsoft sign-in happens upstream at
  // auth.romaine.life — this secret only signs plant-agent's own session
  // JWTs (minted at /api/auth/exchange after we've verified the upstream).
  const [jwtSigningSecret, anthropicApiKey, vapidPublicKey, vapidPrivateKey, notifyApiKey] = (
    await Promise.all([
      kv.getSecret('plant-agent-jwt-signing-secret'),
      kv.getSecret('plant-agent-anthropic-api-key').catch(() => ({ value: null })),
      kv.getSecret('plant-agent-vapid-public-key').catch(() => ({ value: null })),
      kv.getSecret('plant-agent-vapid-private-key').catch(() => ({ value: null })),
      kv.getSecret('plant-agent-notify-api-key').catch(() => ({ value: null })),
    ])
  ).map((s) => s.value);

  if (!anthropicApiKey) {
    console.warn('[config] Anthropic API key not found — AI features disabled');
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[config] VAPID keys not found — push notifications disabled');
  }

  return {
    cosmosDbEndpoint: cosmosEndpoint.value,
    storageAccountEndpoint: storageEndpoint.value,
    jwtSigningSecret,
    anthropicApiKey,
    vapidPublicKey,
    vapidPrivateKey,
    notifyApiKey,
  };
}
