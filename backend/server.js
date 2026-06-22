import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Import Models for auto-seeding
import Banner from "./models/Banner.js";
import Space from "./models/Space.js";
import User from "./models/User.js";
import Review from "./models/Review.js";

// Import Routes
import bannerRoutes from "./routes/banners.js";
import spaceRoutes from "./routes/spaces.js";
import bookingRoutes from "./routes/bookings.js";
import userRoutes from "./routes/users.js";
import reviewRoutes from "./routes/reviews.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    const allowed = [frontendUrl, "http://localhost:3000", "http://localhost:5173"];
    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Database connection
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/joyzone";
mongoose.connect(mongoUri)
  .then(async () => {
    console.log("MongoDB connected successfully.");
    
    // Auto-seeding if Database is empty
    const spaceCount = await Space.countDocuments();
    if (spaceCount === 0) {
      console.log("Ma'lumotlar bazasi bo'sh. Avtomatik to'ldirish (seed) boshlanmoqda...");
      
      const seedBanners = [
        {
          title: "Premium uchrashuvlar uchun tayyor zallar",
          img: "https://images.unsplash.com/photo-1758711516684-e7a87556015e?auto=format&fit=crop&w=1400&q=88",
          redirect: "space-1",
          platform: "All",
          status: "Active"
        },
        {
          title: "Jamoalar uchun yorug' va qulay ish maydoni",
          img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=88",
          redirect: "space-0",
          platform: "All",
          status: "Active"
        },
        {
          title: "Safarlar, uchrashuvlar va dam olish bir joyda",
          img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=88",
          redirect: "space-2",
          platform: "All",
          status: "Active"
        }
      ];

      const seedSpaces = [
        {
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
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=86"
          ],
          promoted: true
        },
        {
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
            "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=86"
          ]
        },
        {
          name: "Orange Desk Office",
          type: "Ofis",
          price: "7 900 000 so'm",
          status: "Active",
          owner_id: "host_3",
          location: "Toshkent, Chilonzor",
          people: 18,
          area: 140,
          images: [
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=900&q=86"
          ],
          promoted: true
        },
        {
          name: "Navoiy Event Space",
          type: "Tadbir joyi",
          price: "1 200 000 so'm",
          status: "Active",
          owner_id: "host_1",
          location: "Samarqand markazi",
          people: 80,
          area: 320,
          images: [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=86"
          ]
        },
        {
          name: "Quiet Work Studio",
          type: "Kovorking",
          price: "240 000 so'm",
          status: "Active",
          owner_id: "host_2",
          location: "Toshkent, Mirobod",
          people: 8,
          area: 42,
          images: [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=86"
          ]
        },
        {
          name: "Blue Line Office",
          type: "Ofis",
          price: "12 500 000 so'm",
          status: "Active",
          owner_id: "host_3",
          location: "Toshkent City",
          people: 32,
          area: 260,
          images: [
            "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86",
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86"
          ]
        }
      ];

      const createdSpaces = await Space.insertMany(seedSpaces);
      console.log("Spaces seed qilindi.");

      const bannersToSeed = seedBanners.map(banner => {
        if (banner.redirect === "space-0") banner.redirect = createdSpaces[0]._id.toString();
        if (banner.redirect === "space-1") banner.redirect = createdSpaces[1]._id.toString();
        if (banner.redirect === "space-2") banner.redirect = createdSpaces[2]._id.toString();
        return banner;
      });

      await Banner.insertMany(bannersToSeed);
      console.log("Banners seed qilindi.");

      // Seed Users if empty
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const seedUsers = [
          { name: "Shaxzod A.", email: "shaxzod@joyzone.uz", role: "Dizayner", isOnline: false, lastLogin: new Date(Date.now() - 3600000) },
          { name: "Malika Toshkent", email: "malika@joyzone.uz", role: "Tashkilotchi", isOnline: false, lastLogin: new Date(Date.now() - 7200000) },
          { name: "Sardorbek Dev", email: "sardor@joyzone.uz", role: "Developer", isOnline: false, lastLogin: new Date() }
        ];
        await User.insertMany(seedUsers);
        console.log("Users seed qilindi.");
      }

      // Seed Reviews if empty
      const reviewCount = await Review.countDocuments();
      if (reviewCount === 0) {
        const firstSpace = createdSpaces[0];
        const secondSpace = createdSpaces[1];
        const seedReviews = [
          {
            space_id: firstSpace ? firstSpace._id.toString() : "648312e0f40a1b2c3d4e5f67",
            space_name: firstSpace ? firstSpace.name : "Focus Hub Coworking",
            name: "Malika Toshkent",
            role: "Tashkilotchi",
            rating: 5,
            text: "Uchrashuv xonasi juda shinam, internet tezligi ajoyib! Xizmat ko'rsatish darajasi juda yuqori."
          },
          {
            space_id: secondSpace ? secondSpace._id.toString() : "648312e0f40a1b2c3d4e5f68",
            space_name: secondSpace ? secondSpace.name : "Atlas Meeting Room",
            name: "Dostonbek",
            role: "Dasturchi",
            rating: 4,
            text: "Kovorking hududi juda sokin ekan, ishlash uchun barcha sharoitlar yaratilgan."
          }
        ];
        await Review.insertMany(seedReviews);
        console.log("Reviews seed qilindi.");
      }

      console.log("Avtomatik to'ldirish (seed) muvaffaqiyatli yakunlandi.");
    }
  })
  .catch((err) => {
    console.error("MongoDB ulanish xatoligi:", err);
  });

// Ensure uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serves static files
app.use("/uploads", express.static("uploads"));

// Base64 image upload route
app.post("/api/upload", (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ message: "Fayl nomi va base64 kontenti zarur." });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: "Noto'g'ri base64 formati." });
    }

    const imageBuffer = Buffer.from(matches[2], "base64");
    const uniqueFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    fs.writeFileSync(filePath, imageBuffer);

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${uniqueFilename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    res.status(500).json({ message: "Faylni yuklashda xatolik", error: error.message });
  }
});

// API Routes
app.use("/api/banners", bannerRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Joyzone API Backend ishlamoqda." });
});

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ["GET", "POST"]
  }
});

app.set("socketio", io);

let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  console.log(`Foydalanuvchi ulandi. Jami onlayn: ${onlineUsers}`);
  
  // Broadcast updated user count to all clients
  io.emit("online_users_update", onlineUsers);

  // Listen for user actions from the frontend User App
  socket.on("client_action", (actionData) => {
    console.log("Mijoz amali qabul qilindi:", actionData);
    
    // Generate a formatted log entry for the Live Traffic Monitor
    const logId = Math.random().toString(36).substring(2, 9);
    const date = new Date();
    const timeStr = date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    let eventType = "Ko'rish";
    let details = "";
    
    switch (actionData.type) {
      case "view_space":
        eventType = "Joyni ko'rish";
        details = `"${actionData.spaceName}" dacha/ofis sahifasini ko'rdi`;
        break;
      case "search":
        eventType = "Qidiruv";
        details = `Filtr bo'yicha qidirdi: "${actionData.query || 'Barchasi'}"`;
        break;
      case "payment":
      case "booking":
        eventType = "To'lov/Bron";
        details = `"${actionData.spaceName}" joyini bron qildi. Narxi: ${actionData.price}`;
        break;
      default:
        eventType = actionData.type || "Faollik";
        details = actionData.details || "Saytda harakat qildi";
    }

    const logEntry = {
      id: logId,
      time: timeStr,
      event: eventType,
      description: details,
      userIp: socket.handshake.address || "Anonim",
    };

    // Broadcast log to all connected clients (especially Admin Dashboard)
    io.emit("new_traffic_log", logEntry);
  });

  socket.on("disconnect", () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    console.log(`Foydalanuvchi uzildi. Jami onlayn: ${onlineUsers}`);
    
    // Broadcast updated user count
    io.emit("online_users_update", onlineUsers);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server portda ishga tushdi: ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api`);
  console.log(`WebSocket Server: ws://localhost:${PORT}`);
});
