import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const MOCK_DATA = {
  banners: [
    {
      id: "banner-1",
      title: "Premium uchrashuvlar uchun tayyor zallar",
      img: "https://images.unsplash.com/photo-1758711516684-e7a87556015e?auto=format&fit=crop&w=1400&q=88",
      redirect: "space-1",
      platform: "All",
      status: "Active",
      created_at: new Date().toISOString()
    },
    {
      id: "banner-2",
      title: "Jamoalar uchun yorug' va qulay ish maydoni",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=88",
      redirect: "space-0",
      platform: "All",
      status: "Active",
      created_at: new Date().toISOString()
    },
    {
      id: "banner-3",
      title: "Safarlar, uchrashuvlar va dam olish bir joyda",
      img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=88",
      redirect: "space-2",
      platform: "All",
      status: "Active",
      created_at: new Date().toISOString()
    }
  ],
  spaces: [
    {
      id: "space-1",
      name: "Focus Hub Coworking",
      type: "Kovorking",
      price: "499 000 so'm",
      status: "Active",
      owner_id: "host_1",
      location: "Toshkent, Mirzo Ulug'bek",
      people: 24,
      area: 180,
      images: [
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86"
      ],
      promoted: true
    },
    {
      id: "space-2",
      name: "Atlas Meeting Room",
      type: "Konferensiya",
      price: "320 000 so'm",
      status: "Active",
      owner_id: "host_2",
      location: "Toshkent, Yunusobod",
      people: 12,
      area: 64,
      images: [
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=86",
        "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=86"
      ]
    }
  ],
  users: [
    { id: "user-1", name: "Shaxzod A.", email: "shaxzod@joyzone.uz", role: "Dizayner", isOnline: false, lastLogin: new Date(Date.now() - 3600000).toISOString() },
    { id: "user-2", name: "Malika Toshkent", email: "malika@joyzone.uz", role: "Tashkilotchi", isOnline: false, lastLogin: new Date(Date.now() - 7200000).toISOString() },
    { id: "user-3", name: "Sardorbek Dev", email: "sardor@joyzone.uz", role: "Developer", isOnline: false, lastLogin: new Date().toISOString() }
  ],
  reviews: [
    {
      id: "review-1",
      space_id: "space-1",
      space_name: "Focus Hub Coworking",
      name: "Malika Toshkent",
      role: "Tashkilotchi",
      rating: 5,
      text: "Uchrashuv xonasi juda shinam, internet tezligi ajoyib! Xizmat ko'rsatish darajasi juda yuqori.",
      date: "12-iyun, 2026"
    },
    {
      id: "review-2",
      space_id: "space-2",
      space_name: "Atlas Meeting Room",
      name: "Dostonbek",
      role: "Dasturchi",
      rating: 4,
      text: "Kovorking hududi juda sokin ekan, ishlash uchun barcha sharoitlar yaratilgan.",
      date: "14-iyun, 2026"
    }
  ],
  bookings: []
};

export const readFallbackData = (collection) => {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    // Populate default mock data if not exists
    fs.writeFileSync(filePath, JSON.stringify(MOCK_DATA[collection] || [], null, 2), "utf8");
    return MOCK_DATA[collection] || [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading fallback collection: ${collection}`, error);
    return MOCK_DATA[collection] || [];
  }
};

export const writeFallbackData = (collection, data) => {
  const filePath = getFilePath(collection);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Error writing fallback collection: ${collection}`, error);
    return false;
  }
};
