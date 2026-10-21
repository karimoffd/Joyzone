// Central Shared Chat Manager for Joyzone
// Backend REST is the source of truth; localStorage is only dev/offline fallback.
import api, { getAccessToken, isStaleSessionError } from '../api/client.js';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storageKeys.js';

const CHAT_STORAGE_KEY = STORAGE_KEYS.offline.chats;
const BACKEND_CHAT_URL = '/api/notifications/chats/';
const BACKEND_MSG_URL = '/api/notifications/chats/message/';

export function canUseBackendChat() {
  return Boolean(getAccessToken());
}

export function getActiveClientName() {
  try {
    return (
      getStorageItem(STORAGE_KEYS.profile.name) ||
      getStorageItem(STORAGE_KEYS.profile.legacyUsername) ||
      "Mehmon"
    );
  } catch (e) {
    return "Mehmon";
  }
}

const INITIAL_CHATS = [
  {
    id: "nosirov-abdulboriy",
    name: "Nosirov Abdulboriy",
    space: "Atlas Meeting Room",
    spaceTitle: "Atlas Meeting Room",
    time: "12 мин",
    preview: "Хотим забронировать зал на 100 человек.",
    unread: true,
    color: "#e46630",
    messages: [
      { from: "guest", text: "Здравствуйте! Нам очень понравился ваш зал." },
      { from: "host", text: "Здравствуйте! Рады слышать, подскажите дату и время?" },
      { from: "guest", text: "Хотим забронировать зал на 100 человек." }
    ]
  },
  {
    id: "nova-labs",
    name: "Nova Labs",
    space: "Quiet Work Studio",
    spaceTitle: "Quiet Work Studio",
    time: "25 мин",
    preview: "Можно ли подготовить доску до 10:00?",
    unread: false,
    color: "#294a6d",
    messages: [
      { from: "guest", text: "Здравствуйте, можно ли подготовить доску и воду до 10:00?" },
      { from: "host", text: "Да, команда подготовит комнату заранее. HDMI тоже будет на столе." }
    ]
  },
  {
    id: "dilnoza-yusupova",
    name: "Dilnoza Yusupova",
    space: "Creative Loft Space",
    spaceTitle: "Creative Loft Space",
    time: "Вчера",
    preview: "Спасибо, всё отлично!",
    unread: false,
    color: "#1a6b6b",
    messages: [
      { from: "guest", text: "Спасибо, всё прошло отлично!" },
      { from: "host", text: "Рады помочь! Ждём вас снова." }
    ]
  }
];

function getInitialChats() {
  return import.meta.env.DEV ? INITIAL_CHATS.map(normalizeChat) : [];
}

function dispatchChatUpdate() {
  window.dispatchEvent(new Event("joyzone-chat-update"));
}

export function getStoredChats() {
  try {
    const raw = getStorageItem(CHAT_STORAGE_KEY);
    if (!raw) {
      const initialChats = getInitialChats();
      if (canUseBackendChat()) {
        setStorageItem(CHAT_STORAGE_KEY, JSON.stringify(initialChats));
      }
      return initialChats;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeChat) : getInitialChats();
  } catch (error) {
    return getInitialChats();
  }
}

export function saveStoredChats(chats) {
  try {
    setStorageItem(CHAT_STORAGE_KEY, JSON.stringify((chats || []).map(normalizeChat)));
    dispatchChatUpdate();
  } catch (error) {
    console.error("Failed to save chats to storage", error);
  }
}

export function getMessageSender(message) {
  return String(message?.from || message?.sender || message?.from_sender || "guest").toLowerCase();
}

export function normalizeChatMessage(message = {}) {
  const from = getMessageSender(message);
  return {
    ...message,
    from,
    sender: message.sender || from,
    from_sender: message.from_sender || from
  };
}

export function normalizeChat(chat = {}) {
  const spaceTitle = chat.spaceTitle || chat.space_title || chat.space || "Joyzone Space";
  const hostName = chat.hostName || chat.host_name || chat.host_user_name || "Ega / Host";
  return {
    ...chat,
    id: chat.id || chat.thread_id,
    threadId: chat.thread_id || chat.id,
    placeId: chat.place_id || chat.placeId || chat.space_id,
    guestId: chat.guest_id || chat.guestId,
    hostId: chat.host_id || chat.hostId,
    name: chat.guest_name || chat.name || "Joyzone user",
    hostName,
    host_name: hostName,
    space: spaceTitle,
    spaceTitle,
    space_title: spaceTitle,
    preview: chat.preview || chat.last || "Диалог начат...",
    unread: Boolean(chat.unread),
    color: chat.color || "#e46630",
    messages: Array.isArray(chat.messages) ? chat.messages.map(normalizeChatMessage) : []
  };
}

function upsertStoredChat(chat) {
  const normalized = normalizeChat(chat);
  const chats = getStoredChats();
  const index = chats.findIndex((item) => String(item.id) === String(normalized.id));
  const updated = index >= 0
    ? chats.map((item, itemIndex) => itemIndex === index ? normalized : item)
    : [normalized, ...chats];
  saveStoredChats(updated);
  return normalized;
}

// Several widgets poll chats at the same time; share one in-flight request.
const inFlightSyncs = new Map();

export function syncChatsWithBackend(options = {}) {
  const key = String(options.placeId || "");
  if (!inFlightSyncs.has(key)) {
    inFlightSyncs.set(key, fetchChatsFromBackend(options).finally(() => inFlightSyncs.delete(key)));
  }
  return inFlightSyncs.get(key);
}

async function fetchChatsFromBackend({ placeId, silent = false, allowDevFallback = true } = {}) {
  if (!canUseBackendChat()) {
    if (import.meta.env.DEV && allowDevFallback) return getStoredChats();
    throw new Error("Authentication is required to load chats.");
  }

  try {
    const params = placeId ? { place: placeId } : {};
    const res = await api.get(BACKEND_CHAT_URL, { params });
    const data = res.data?.results || res.data || [];
    if (Array.isArray(data)) {
      const normalizedChats = data.map(normalizeChat);
      setStorageItem(CHAT_STORAGE_KEY, JSON.stringify(normalizedChats));
      if (!silent) dispatchChatUpdate();
      return normalizedChats;
    }
  } catch (err) {
    if (isStaleSessionError(err)) throw err;
    if (import.meta.env.DEV && allowDevFallback) {
      console.warn("Backend chat sync error (using local storage fallback):", err.message);
      return getStoredChats();
    }
    throw err;
  }
  return [];
}

export function getChatById(chatId) {
  const chats = getStoredChats();
  return chats.find((c) => String(c.id) === String(chatId) || String(c.threadId) === String(chatId)) || null;
}

function localStartOrGetChatForSpace({ spaceTitle, hostName, clientName }) {
  const chats = getStoredChats();
  const activeClient = clientName || getActiveClientName();
  const slug = (spaceTitle || "space").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let existingChat = chats.find((c) => c.spaceTitle === spaceTitle || c.id === slug);

  if (existingChat) {
    if (activeClient && existingChat.name !== activeClient) {
      existingChat.name = activeClient;
      saveStoredChats(chats);
    }
    return existingChat;
  }

  const newChat = normalizeChat({
    id: slug,
    name: activeClient,
    hostName: hostName || "Ega / Host",
    space: spaceTitle || "Joyzone Space",
    spaceTitle: spaceTitle || "Joyzone Space",
    time: "Только что",
    preview: "Диалог начат...",
    unread: false,
    color: "#294a6d",
    messages: [
      { from: "host", text: `Здравствуйте! Добро пожаловать в ${spaceTitle}. Чем могу помочь?` }
    ]
  });

  saveStoredChats([newChat, ...chats]);
  return newChat;
}

export async function startOrGetChatForSpace({ spaceId, placeId, spaceTitle, hostName, clientName }) {
  const targetPlaceId = placeId || spaceId;
  if (canUseBackendChat() && targetPlaceId) {
    try {
      const res = await api.post(BACKEND_CHAT_URL, {
        place_id: targetPlaceId,
        name: clientName || getActiveClientName(),
        host_name: hostName || 'Ega / Host'
      });
      return upsertStoredChat(res.data);
    } catch (e) {
      if (isStaleSessionError(e)) throw e;
      console.warn("Failed to create backend chat (using fallback):", e.message);
    }
  }
  if (!import.meta.env.DEV && canUseBackendChat()) return null;
  return localStartOrGetChatForSpace({ spaceTitle, hostName, clientName });
}

function saveLocalMessage(chatId, sender, messageText) {
  if (!messageText) return null;
  const chats = getStoredChats();
  let targetChat = null;

  const updatedChats = chats.map((chat) => {
    if (String(chat.id) === String(chatId) || String(chat.threadId) === String(chatId)) {
      const updatedMessages = [
        ...chat.messages,
        normalizeChatMessage({
          from: sender,
          text: messageText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      ];
      targetChat = normalizeChat({
        ...chat,
        preview: messageText,
        time: "Только что",
        unread: sender === "guest",
        messages: updatedMessages
      });
      return targetChat;
    }
    return chat;
  });

  saveStoredChats(updatedChats);
  return targetChat;
}

export async function sendMessageToChat(chatId, { from, text }, { allowDevFallback = true } = {}) {
  if (!text || !text.trim()) return null;
  const sender = getMessageSender({ from });
  const messageText = text.trim();

  if (canUseBackendChat()) {
    try {
      const res = await api.post(BACKEND_MSG_URL, {
        chat_id: chatId,
        from: sender,
        text: messageText
      });
      return upsertStoredChat(res.data);
    } catch (e) {
      if (isStaleSessionError(e)) throw e;
      if (import.meta.env.DEV && allowDevFallback) {
        console.warn("Failed to post message to Django backend (using local fallback):", e.message);
        return saveLocalMessage(chatId, sender, messageText);
      }
      throw e;
    }
  }

  if (import.meta.env.DEV && allowDevFallback) {
    return saveLocalMessage(chatId, sender, messageText);
  }
  throw new Error("Authentication is required to send messages.");
}

export async function markChatRead(chatId, { allowDevFallback = true } = {}) {
  if (!chatId) return null;
  if (!canUseBackendChat()) {
    if (import.meta.env.DEV && allowDevFallback) return null;
    throw new Error("Authentication is required to mark chats as read.");
  }
  try {
    const res = await api.post(`/api/notifications/chats/${chatId}/read/`);
    return upsertStoredChat(res.data);
  } catch (e) {
    if (isStaleSessionError(e)) throw e;
    if (import.meta.env.DEV && allowDevFallback) {
      console.warn("Failed to mark chat as read:", e.message);
      return null;
    }
    throw e;
  }
}

export async function fetchUnreadChatCount() {
  if (!canUseBackendChat()) return 0;
  try {
    const res = await api.get('/api/notifications/chats/unread-count/');
    return Number(res.data?.count || 0);
  } catch (e) {
    console.warn("Failed to fetch chat unread count:", e.message);
    return 0;
  }
}
