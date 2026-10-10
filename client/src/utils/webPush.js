import api from "./api";

// Standard boilerplate conversion PushManager.subscribe() requires --
// applicationServerKey must be a Uint8Array, not the base64url string VAPID
// keys are generated/stored as.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function getPushSupportAndPermission() {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { supported, permission: supported ? Notification.permission : "unsupported" };
}

// Full current state for a persistent toggle -- deliberately checks for an
// actual live PushSubscription rather than trusting Notification.permission
// alone: permission stays "granted" forever once given, even after the
// student explicitly toggles off (unsubscribeFromPush revokes the
// subscription, not the permission), so permission alone can't tell the
// toggle whether it should currently read on or off.
export async function getPushToggleState() {
  const { supported, permission } = getPushSupportAndPermission();
  if (!supported) return { supported, permission, subscribed: false };
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    return { supported, permission, subscribed: !!subscription };
  } catch {
    return { supported, permission, subscribed: false };
  }
}

// Registers the service worker, requests permission (this is the call that
// triggers the browser's own native prompt), subscribes to push, and saves
// the subscription server-side. Returns { ok, reason } rather than throwing,
// so the caller can show the right state without a try/catch of its own.
export async function subscribeToPush() {
  const { supported } = getPushSupportAndPermission();
  if (!supported) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const readyRegistration = await navigator.serviceWorker.ready.catch(() => registration);
    const subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
    await api.post("/student/push-subscription", subscription.toJSON());
    return { ok: true };
  } catch (err) {
    console.error("Push subscription error:", err);
    return { ok: false, reason: "error" };
  }
}

// Explicit opt-out -- unsubscribes locally and tells the server to drop the
// row, rather than leaving a dead subscription the server keeps failing to
// push to until it eventually 410s and gets pruned there instead.
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await api.delete("/student/push-subscription", { data: { endpoint } });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
  }
}
