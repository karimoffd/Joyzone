import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

// Connect to WebSocket server
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});

socket.on("connect", () => {
  console.log("WebSocket serverga muvaffaqiyatli ulandi (ID:", socket.id, ")");
});

socket.on("disconnect", () => {
  console.log("WebSocket ulanishi uzildi");
});

/**
 * Serverga mijoz harakatlarini WebSocket orqali yuborish
 * @param {string} type - Harakat turi ('view_space', 'search', 'booking'/'payment', 'general')
 * @param {object} details - Qo'shimcha ma'lumotlar (spaceName, query, price, va h.k.)
 */
export const sendClientAction = (type, details = {}) => {
  if (socket.connected) {
    socket.emit("client_action", {
      type,
      ...details,
      timestamp: new Date().toISOString()
    });
  } else {
    console.warn("WebSocket ulanmagan, harakat yuborilmadi:", type, details);
  }
};
