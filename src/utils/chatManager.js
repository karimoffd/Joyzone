// Central Shared Chat Manager for Joyzone
// Syncs live chats across Client Space Details, Host Dashboard, and Admin Panel

const CHAT_STORAGE_KEY = "joyzone-shared-chats";

export function getActiveClientName() {
  try {
    return (
      localStorage.getItem("joyzone-name") ||
      localStorage.getItem("joyzone-username") ||
      "Nosirov Abdulboriy"
    );
  } catch (e) {
    return "Nosirov Abdulboriy";
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

export function getStoredChats() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(INITIAL_CHATS));
      return INITIAL_CHATS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CHATS;
  } catch (error) {
    return INITIAL_CHATS;
  }
}

export function saveStoredChats(chats) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
    window.dispatchEvent(new Event("joyzone-chat-update"));
  } catch (error) {
    console.error("Failed to save chats to storage", error);
  }
}

export function getChatById(chatId) {
  const chats = getStoredChats();
  return chats.find((c) => String(c.id) === String(chatId)) || null;
}

export function startOrGetChatForSpace({ spaceTitle, hostName, clientName }) {
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

  const newChat = {
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
  };

  const updatedChats = [newChat, ...chats];
  saveStoredChats(updatedChats);
  return newChat;
}

export function sendMessageToChat(chatId, { from, text }) {
  if (!text || !text.trim()) return null;
  const chats = getStoredChats();
  let targetChat = null;

  const updatedChats = chats.map((chat) => {
    if (String(chat.id) === String(chatId)) {
      const updatedMessages = [
        ...chat.messages,
        { from: from || "guest", text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ];
      targetChat = {
        ...chat,
        preview: text.trim(),
        time: "Только что",
        unread: from === "guest",
        messages: updatedMessages
      };
      return targetChat;
    }
    return chat;
  });

  saveStoredChats(updatedChats);
  return targetChat;
}
