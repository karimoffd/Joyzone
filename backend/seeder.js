import mongoose from "mongoose";
import dotenv from "dotenv";
import Banner from "./models/Banner.js";
import Space from "./models/Space.js";
import Booking from "./models/Booking.js";
import User from "./models/User.js";
import Review from "./models/Review.js";

dotenv.config();

const bannersData = [
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

const spacesData = [
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
    ],
    promoted: false
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
    ],
    promoted: false
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
    ],
    promoted: false
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
    ],
    promoted: false
  }
];

const seedDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || "mongodb://localhost:27017/joyzone";
    console.log("MongoDB ga ulanilmoqda:", connString);
    await mongoose.connect(connString);
    console.log("MongoDB ulanishi muvaffaqiyatli!");

    // Clear existing collections
    console.log("Mavjud ma'lumotlar o'chirilmoqda...");
    await Banner.deleteMany({});
    await Space.deleteMany({});
    await Booking.deleteMany({});
    await User.deleteMany({});
    await Review.deleteMany({});

    // Seed Spaces
    console.log("Spaces (joylar) yuklanmoqda...");
    const createdSpaces = await Space.insertMany(spacesData);
    console.log(`${createdSpaces.length} ta joy bazaga yuklandi.`);

    // Match banner redirects to actual generated Space IDs if possible
    const bannersToSeed = bannersData.map(banner => {
      if (banner.redirect === "space-0") {
        banner.redirect = createdSpaces[0]._id.toString();
      } else if (banner.redirect === "space-1") {
        banner.redirect = createdSpaces[1]._id.toString();
      } else if (banner.redirect === "space-2") {
        banner.redirect = createdSpaces[2]._id.toString();
      }
      return banner;
    });

    // Seed Banners
    console.log("Banners (sliderlar) yuklanmoqda...");
    const createdBanners = await Banner.insertMany(bannersToSeed);
    console.log(`${createdBanners.length} ta banner bazaga yuklandi.`);

    // Seed Users
    console.log("Users (foydalanuvchilar) yuklanmoqda...");
    const seedUsers = [
      { name: "Shaxzod A.", email: "shaxzod@joyzone.uz", role: "Dizayner", isOnline: false, lastLogin: new Date(Date.now() - 3600000) },
      { name: "Malika Toshkent", email: "malika@joyzone.uz", role: "Tashkilotchi", isOnline: false, lastLogin: new Date(Date.now() - 7200000) },
      { name: "Sardorbek Dev", email: "sardor@joyzone.uz", role: "Developer", isOnline: false, lastLogin: new Date() }
    ];
    await User.insertMany(seedUsers);
    console.log("Users yuklandi.");

    // Seed Reviews
    console.log("Reviews (fikrlar) yuklanmoqda...");
    const seedReviews = [
      {
        space_id: createdSpaces[0]._id.toString(),
        space_name: createdSpaces[0].name,
        name: "Malika Toshkent",
        role: "Tashkilotchi",
        rating: 5,
        text: "Uchrashuv xonasi juda shinam, internet tezligi ajoyib! Xizmat ko'rsatish darajasi juda yuqori."
      },
      {
        space_id: createdSpaces[1]._id.toString(),
        space_name: createdSpaces[1].name,
        name: "Dostonbek",
        role: "Dasturchi",
        rating: 4,
        text: "Kovorking hududi juda sokin ekan, ishlash uchun barcha sharoitlar yaratilgan."
      }
    ];
    await Review.insertMany(seedReviews);
    console.log("Reviews yuklandi.");

    console.log("Seeding muvaffaqiyatli yakunlandi!");
    process.exit(0);
  } catch (error) {
    console.error("Seedingda xatolik yuz berdi:", error);
    process.exit(1);
  }
};

seedDB();
