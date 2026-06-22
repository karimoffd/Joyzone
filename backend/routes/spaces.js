import express from "express";
import mongoose from "mongoose";
import Space from "../models/Space.js";
import { readFallbackData, writeFallbackData } from "../utils/fallbackDb.js";

const router = express.Router();

const mapFallbackSpace = (space) => {
  if (!space) return null;
  return {
    ...space,
    title: space.title || space.name,
    category: space.category || space.type
  };
};

// GET all spaces
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const mapped = spaces.map(mapFallbackSpace);
      return res.json(mapped);
    }
    const spaces = await Space.find().sort({ created_at: -1 });
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// GET space by ID
router.get("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const space = spaces.find(s => s.id === req.params.id);
      if (!space) {
        return res.status(404).json({ message: "Joy topilmadi" });
      }
      return res.json(mapFallbackSpace(space));
    }
    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ message: "Joy topilmadi" });
    }
    res.json(space);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// POST a new space
router.post("/", async (req, res) => {
  try {
    const { name, type, price, status, owner_id, location, people, area, images, promoted, priceOverrides } = req.body;
    
    if (!name || !type || !price || !owner_id) {
      return res.status(400).json({ message: "Zarur maydonlar kiritilmadi (name, type, price, owner_id)" });
    }

    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const newSpace = {
        id: "space-" + Date.now(),
        name,
        type,
        price,
        status: status || "Active",
        owner_id,
        location: location || "",
        people: people || 1,
        area: area || 0,
        images: images || [],
        promoted: promoted || false,
        priceOverrides: priceOverrides || {},
        created_at: new Date().toISOString()
      };
      spaces.unshift(newSpace);
      writeFallbackData("spaces", spaces);
      return res.status(201).json(mapFallbackSpace(newSpace));
    }

    const newSpace = new Space({
      name,
      type,
      price,
      status: status || "Active",
      owner_id,
      location: location || "",
      people: people || 1,
      area: area || 0,
      images: images || [],
      promoted: promoted || false,
      priceOverrides: priceOverrides || {}
    });

    const savedSpace = await newSpace.save();
    res.status(201).json(savedSpace);
  } catch (error) {
    res.status(400).json({ message: "Xato ma'lumot kiritildi", error: error.message });
  }
});

// PUT (update) a space by ID
router.put("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const idx = spaces.findIndex(s => s.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ message: "Joy topilmadi" });
      }

      const fields = ["name", "type", "price", "status", "owner_id", "location", "people", "area", "images", "promoted", "priceOverrides"];
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          spaces[idx][field] = req.body[field];
        }
      });

      writeFallbackData("spaces", spaces);
      return res.json(mapFallbackSpace(spaces[idx]));
    }

    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ message: "Joy topilmadi" });
    }

    const fields = ["name", "type", "price", "status", "owner_id", "location", "people", "area", "images", "promoted", "priceOverrides"];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        space[field] = req.body[field];
      }
    });

    const updatedSpace = await space.save();
    res.json(updatedSpace);
  } catch (error) {
    res.status(400).json({ message: "Yangilashda xatolik yuz berdi", error: error.message });
  }
});

// DELETE a space by ID
router.delete("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const filtered = spaces.filter(s => s.id !== req.params.id);
      if (spaces.length === filtered.length) {
        return res.status(404).json({ message: "Joy topilmadi" });
      }
      writeFallbackData("spaces", filtered);
      return res.json({ message: "Joy muvaffaqiyatli o'chirildi", id: req.params.id });
    }

    const space = await Space.findByIdAndDelete(req.params.id);
    if (!space) {
      return res.status(404).json({ message: "Joy topilmadi" });
    }
    res.json({ message: "Joy muvaffaqiyatli o'chirildi", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik yuz berdi", error: error.message });
  }
});

export default router;
