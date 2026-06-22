# Joyzone Admin Dashboard Integratsiya Qo'llanmasi

Ushbu yo'riqnoma orqali `"joyzone-react-admin-dashboard"` loyihangizdagi mock (soxta) ma'lumotlarni biz yozgan real Node.js/Express serveriga hamda WebSocket trafik monitor tizimiga qanday bog'lashni o'rganasiz.

## 1. Zaruriy Kutubxonalarni O'rnatish

Admin paneli loyihangiz papkasida terminalni ochib, REST API va WebSocket ulanishlari uchun quyidagi kutubxonalarni o'rnating:

```bash
npm install axios socket.io-client
```

## 2. Integratsiya Kodini Qo'llash

`admin-integration.jsx` fayli ichidagi kod namunasi to'liq ishchi holatda yozilgan. Uni loyihangizdagi `App.jsx` yoki asosiy Dashboard oynasi komponentining o'rniga joylashtirishingiz mumkin.

### Muhim Bog'lanish Nuqtalari:

1. **WebSocket Server Ulanishi:**
   `const socket = io("http://localhost:5000");` - bu kod orqali backend bilan doimiy WebSocket aloqa o'rnatiladi.
   - `online_users_update` eventini tinglab, real vaqtdagi foydalanuvchilar sonini `onlineUsers` state'iga o'rnatadi.
   - `new_traffic_log` eventini tinglab, mijozlar saytida (User App) bajarilgan har bir amalni (joyni ko'rish, qidiruv berish, bron qilish) real vaqtda `trafficLogs` ro'yxatining boshiga qo'shadi.

2. **REST API (Axios):**
   - `GET /api/bookings` - mijozlar qilgan barcha bronlarni yuklaydi va statusini o'zgartirish (Paid/Cancelled) imkonini beradi.
   - `GET /api/banners` - bosh sahifadagi slider rasmlarini yuklaydi.
   - `POST /api/banners` - yangi slider banner qo'shadi.
   - `PUT /api/banners/:id` - slider bannerning holati (Active/Inactive) yoki boshqa parametrlarini yangilaydi.
   - `DELETE /api/banners/:id` - slider bannerni o'chiradi.

## 3. Ishga Tushirish Ketma-ketligi

Loyiha to'liq va real vaqt rejimida ishlashi uchun quyidagi amallarni bajaring:

1. **Backend Serverni ishga tushiring:**
   Backend papkasi (`/backend`) ichida terminalda:
   ```bash
   npm run dev
   ```
   Server `http://localhost:5000` portida ishga tushadi va MongoDBga ulanadi (agar baza bo'sh bo'lsa, u mock ma'lumotlar bilan avtomat to'ldiriladi).

2. **Asosiy Mijozlar Saytini (User App) ishga tushiring:**
   Loyiha bosh papkasida (`d:\JoyZone v2`) terminalda:
   ```bash
   npm run dev
   ```
   Vite orqali `http://localhost:5173` da mijozlar sayti ochiladi. Foydalanuvchilar dacha yoki ofislarni ko'rishi, qidirishi va bron qilishi mumkin. Bu amallarning barchasi WebSocket orqali serverga yuboriladi.

3. **Admin Dashboardni ishga tushiring:**
   Taqdim etilgan `admin-integration.jsx` komponenti o'rnatilgan Admin panelni ishga tushiring. Siz real vaqtda foydalanuvchilar soni ortayotganini va harakat qilganda Live Traffic Monitor bo'limida loglar yangilanayotganini ko'rasiz.
