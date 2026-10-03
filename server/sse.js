/**
 * SSE (Server-Sent Events) manager
 * - Session payments: instant green-tick update when payment is confirmed
 * - Vendor <-> Admin chat: instant message delivery in real-time
 */

const sessionListeners = new Map(); // sessionId -> Set<res>
const chatListeners = new Map();    // channelKey ('vendor:VENDOR_ID' or 'admin') -> Set<res>

/* ── Payment Session Listeners ── */
export function addSSEListener(sessionId, res) {
  if (!sessionListeners.has(sessionId)) {
    sessionListeners.set(sessionId, new Set());
  }
  sessionListeners.get(sessionId).add(res);
}

export function removeSSEListener(sessionId, res) {
  const set = sessionListeners.get(sessionId);
  if (set) {
    set.delete(res);
    if (set.size === 0) sessionListeners.delete(sessionId);
  }
}

export function pushPaymentEvent(sessionId, eventData) {
  const set = sessionListeners.get(sessionId);
  if (!set || set.size === 0) return;

  const msg = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      set.delete(res);
    }
  }
  console.log(`[SSE] Pushed payment event to ${set.size} listener(s) for session ${sessionId}`);
}

/* ── Real-Time Chat & Notification Listeners ── */
export function addChatListener(channelKey, res) {
  if (!chatListeners.has(channelKey)) {
    chatListeners.set(channelKey, new Set());
  }
  chatListeners.get(channelKey).add(res);
}

export function removeChatListener(channelKey, res) {
  const set = chatListeners.get(channelKey);
  if (set) {
    set.delete(res);
    if (set.size === 0) chatListeners.delete(channelKey);
  }
}

export function pushChatEvent(channelKey, eventData) {
  const set = chatListeners.get(channelKey);
  if (!set || set.size === 0) return;

  const msg = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      set.delete(res);
    }
  }
  console.log(`[SSE Chat] Pushed event to channel ${channelKey} (${set.size} listeners)`);
}

/* ── Real-Time Customer Live Bill & Payment Listeners ── */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
}

const customerListeners = new Map(); // normalizedPhone -> Set<res>

export function addCustomerListener(phone, res) {
  const clean = normalizePhone(phone);
  if (!clean) return;
  if (!customerListeners.has(clean)) {
    customerListeners.set(clean, new Set());
  }
  customerListeners.get(clean).add(res);
}

export function removeCustomerListener(phone, res) {
  const clean = normalizePhone(phone);
  if (!clean) return;
  const set = customerListeners.get(clean);
  if (set) {
    set.delete(res);
    if (set.size === 0) customerListeners.delete(clean);
  }
}

export function pushCustomerEvent(phone, eventData) {
  const clean = normalizePhone(phone);
  if (!clean) return;
  const set = customerListeners.get(clean);
  if (!set || set.size === 0) return;

  const msg = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      set.delete(res);
    }
  }
  console.log(`[SSE Customer] Pushed event to ${set.size} listener(s) for customer mobile ${clean}`);
}
