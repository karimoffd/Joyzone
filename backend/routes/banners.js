import express from "express";
import mongoose from "mongoose";
import Banner from "../models/Banner.js";
import { readFallbackData, writeFallbackData } from "../utils/fallbackDb.js";

const router = express.Router();

// GET all banners
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const banners = readFallbackData("banners");
      return res.json(banners);
    }
    const banners = await Banner.find().sort({ created_at: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// POST a new banner
router.post("/", async (req, res) => {
  try {
    const { title, img, redirect, platform, status } = req.body;
    
    if (!title || !img || !redirect) {
      return res.status(400).json({ message: "Zarur maydonlar kiritilmadi (title, img, redirect)" });
    }

    if (mongoose.connection.readyState !== 1) {
      const banners = readFallbackData("banners");
      const newBanner = {
        id: "banner-" + Date.now(),
        title,
        img,
        redirect,
        platform: platform || "All",
        status: status || "Active",
        created_at: new Date().toISOString()
      };
      banners.unshift(newBanner);
      writeFallbackData("banners", banners);
      return res.status(201).json(newBanner);
    }

    const newBanner = new Banner({
      title,
      img,
      redirect,
      platform: platform || "All",
      status: status || "Active"
    });

    const savedBanner = await newBanner.save();
    res.status(201).json(savedBanner);
  } catch (error) {
    res.status(400).json({ message: "Xato ma'lumot kiritildi", error: error.message });
  }
});

// PUT (update) a banner by ID
router.put("/:id", async (req, res) => {
  try {
    const { title, img, redirect, platform, status } = req.body;
    
    if (mongoose.connection.readyState !== 1) {
      const banners = readFallbackData("banners");
      const idx = banners.findIndex(b => b.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ message: "Banner topilmadi" });
      }
      if (title !== undefined) banners[idx].title = title;
      if (img !== undefined) banners[idx].img = img;
      if (redirect !== undefined) banners[idx].redirect = redirect;
      if (platform !== undefined) banners[idx].platform = platform;
      if (status !== undefined) banners[idx].status = status;
      
      writeFallbackData("banners", banners);
      return res.json(banners[idx]);
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner topilmadi" });
    }

    if (title !== undefined) banner.title = title;
    if (img !== undefined) banner.img = img;
    if (redirect !== undefined) banner.redirect = redirect;
    if (platform !== undefined) banner.platform = platform;
    if (status !== undefined) banner.status = status;

    const updatedBanner = await banner.save();
    res.json(updatedBanner);
  } catch (error) {
    res.status(400).json({ message: "Yangilashda xatolik yuz berdi", error: error.message });
  }
});

// DELETE a banner by ID
router.delete("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const banners = readFallbackData("banners");
      const filtered = banners.filter(b => b.id !== req.params.id);
      if (banners.length === filtered.length) {
        return res.status(404).json({ message: "Banner topilmadi" });
      }
      writeFallbackData("banners", filtered);
      return res.json({ message: "Banner muvaffaqiyatli o'chirildi", id: req.params.id });
    }

    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner topilmadi" });
    }
    res.json({ message: "Banner muvaffaqiyatli o'chirildi", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik yuz berdi", error: error.message });
  }
});

export default router;
