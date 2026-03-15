/// <reference types="vite/client" />

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, config: { theme?: string; size?: string; width?: number; text?: string }): void;
}

interface Window {
  google: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
