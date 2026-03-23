import { useState, useEffect, useCallback } from 'react';
import { apiFetch, API_BASE } from '../api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function usePushSubscription() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isSupported);

    if (!isSupported) {
      setLoading(false);
      return;
    }

    // Register SW and check existing subscription
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      // Fetch VAPID public key from backend
      const res = await fetch(`${API_BASE}/api/push/vapid-key`);
      const { publicKey } = await res.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint, keys }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const { endpoint } = subscription.toJSON() as { endpoint: string };
        await subscription.unsubscribe();
        await apiFetch('/api/push/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint }),
        });
      }

      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
