import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import { readFallbackData, writeFallbackData } from "../utils/fallbackDb.js";

const router = express.Router();

// GET all reviews
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const reviews = readFallbackData("reviews");
      return res.json(reviews);
    }
    const reviews = await Review.find().sort({ created_at: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// GET reviews for a specific space
router.get("/space/:spaceId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const reviews = readFallbackData("reviews");
      const filtered = reviews.filter(r => r.space_id === req.params.spaceId);
      return res.json(filtered);
    }
    const reviews = await Review.find({ space_id: req.params.spaceId }).sort({ created_at: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// POST a new review
router.post("/", async (req, res) => {
  try {
    const { space_id, space_name, name, role, rating, text } = req.body;

    if (!space_id || !space_name || !name || !rating || !text) {
      return res.status(400).json({ message: "Zarur maydonlar kiritilmadi (space_id, space_name, name, rating, text)." });
    }

    if (mongoose.connection.readyState !== 1) {
      const reviews = readFallbackData("reviews");
      const newReview = {
        id: "review-" + Date.now(),
        space_id,
        space_name,
        name,
        role: role || "Mehmon",
        rating,
        text,
        date: new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" }),
        created_at: new Date().toISOString()
      };
      reviews.unshift(newReview);
      writeFallbackData("reviews", reviews);

      // Emit socket event to notify admin dashboard
      const io = req.app.get("socketio");
      if (io) {
        io.emit("new_review", newReview);
      }

      return res.status(201).json(newReview);
    }

    const newReview = new Review({
      space_id,
      space_name,
      name,
      role: role || "Mehmon",
      rating,
      text
    });

    const savedReview = await newReview.save();

    // Emit socket event to notify admin dashboard
    const io = req.app.get("socketio");
    if (io) {
      io.emit("new_review", savedReview);
    }

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(400).json({ message: "Fikr qoldirishda xatolik yuz berdi.", error: error.message });
  }
});

// DELETE a review by ID (admin dashboard feature)
router.delete("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const reviews = readFallbackData("reviews");
      const filtered = reviews.filter(r => r.id !== req.params.id);
      if (reviews.length === filtered.length) {
        return res.status(404).json({ message: "Fikr topilmadi" });
      }
      writeFallbackData("reviews", filtered);
      return res.json({ message: "Fikr muvaffaqiyatli o'chirildi", id: req.params.id });
    }

    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Fikr topilmadi" });
    }
    res.json({ message: "Fikr muvaffaqiyatli o'chirildi", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik yuz berdi", error: error.message });
  }
});

export default router;
