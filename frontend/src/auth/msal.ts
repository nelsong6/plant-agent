import { PublicClientApplication } from '@azure/msal-browser';

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
});

export const msalReady = msalInstance.initialize();
