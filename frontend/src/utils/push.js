// Convertit une clé VAPID base64 (format web) en Uint8Array, requis par l'API PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Délai dépassé: ${label}`)), ms)
    )
  ]);
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await withTimeout(navigator.serviceWorker.ready, 8000, "service worker pas prêt");
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(authFetch) {
  if (!isPushSupported()) {
    throw new Error("Notifications non supportées sur ce navigateur/appareil.");
  }

  if (!isStandalone()) {
    throw new Error("Ouvre l'app depuis son icône sur l'écran d'accueil (pas depuis Safari) pour activer les notifications.");
  }

  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    throw new Error(`Étape permission: ${err.message}`);
  }
  if (permission !== "granted") {
    throw new Error(`Permission ${permission === "denied" ? "refusée" : "non accordée"}. Vérifie Réglages > SmartFridge > Notifications.`);
  }

  let publicKey;
  try {
    const res = await withTimeout(authFetch("/push/vapid-public-key"), 8000, "récupération de la clé serveur");
    if (!res.ok) throw new Error(`serveur a répondu ${res.status}`);
    const data = await res.json();
    publicKey = data.publicKey;
    if (!publicKey) throw new Error("clé publique manquante dans la réponse du serveur");
  } catch (err) {
    throw new Error(`Étape clé serveur: ${err.message}`);
  }

  let registration;
  try {
    registration = await withTimeout(navigator.serviceWorker.ready, 8000, "service worker pas prêt");
  } catch (err) {
    throw new Error(`Étape service worker: ${err.message}`);
  }

  let subscription;
  try {
    subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }),
      8000,
      "abonnement au service push"
    );
  } catch (err) {
    throw new Error(`Étape abonnement: ${err.message}`);
  }

  try {
    const res = await withTimeout(
      authFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON())
      }),
      8000,
      "enregistrement côté serveur"
    );
    if (!res.ok) throw new Error(`serveur a répondu ${res.status}`);
  } catch (err) {
    throw new Error(`Étape enregistrement serveur: ${err.message}`);
  }

  return subscription;
}

export async function unsubscribeFromPush(authFetch) {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;

  await authFetch("/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });
  await subscription.unsubscribe();
}
