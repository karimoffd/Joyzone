import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Space from "../models/Space.js";
import { readFallbackData, writeFallbackData } from "../utils/fallbackDb.js";

const router = express.Router();

// GET all bookings (populated with space details)
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const bookings = readFallbackData("bookings");
      const spaces = readFallbackData("spaces");
      
      // Populate space details manually in JSON fallback
      const populated = bookings.map(b => {
        const space = spaces.find(s => s.id === b.space_id);
        return {
          ...b,
          space_id: space || { name: "Noma'lum joy", location: "" }
        };
      });
      
      return res.json(populated);
    }
    const bookings = await Booking.find()
      .populate("space_id")
      .sort({ created_at: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// POST a new booking
router.post("/", async (req, res) => {
  try {
    const { user_id, space_id, start_date, end_date, total_price, status, note } = req.body;
    
    if (!user_id || !space_id || !start_date || !end_date || total_price === undefined) {
      return res.status(400).json({ message: "Zarur maydonlar kiritilmadi (user_id, space_id, start_date, end_date, total_price)" });
    }

    const formatToYYYYMMDD = (dStr) => {
      if (!dStr) return "";
      return dStr.split("T")[0];
    };
    const formattedStart = formatToYYYYMMDD(start_date);
    const formattedEnd = formatToYYYYMMDD(end_date);

    if (mongoose.connection.readyState !== 1) {
      const spaces = readFallbackData("spaces");
      const space = spaces.find(s => s.id === space_id);
      if (!space) {
        return res.status(404).json({ message: "Tanlangan joy (Space) topilmadi" });
      }

      const bookings = readFallbackData("bookings");
      const newBooking = {
        id: "booking-" + Date.now(),
        user_id,
        space_id,
        start_date: formattedStart,
        end_date: formattedEnd,
        total_price,
        status: status || "Pending",
        note: note || "",
        created_at: new Date().toISOString()
      };
      bookings.unshift(newBooking);
      writeFallbackData("bookings", bookings);

      // Return populated version
      const populated = {
        ...newBooking,
        space_id: space
      };
      return res.status(201).json(populated);
    }

    // Verify if space exists in MongoDB
    const space = await Space.findById(space_id);
    if (!space) {
      return res.status(404).json({ message: "Tanlangan joy (Space) topilmadi" });
    }

    const newBooking = new Booking({
      user_id,
      space_id,
      start_date: formattedStart,
      end_date: formattedEnd,
      total_price,
      status: status || "Pending",
      note: note || ""
    });

    const savedBooking = await newBooking.save();
    
    // Populate space before sending response
    const populatedBooking = await Booking.findById(savedBooking._id).populate("space_id");
    
    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(400).json({ message: "Xato ma'lumot kiritildi", error: error.message });
  }
});

// PUT (update) booking status by ID (e.g. Paid, Cancelled, booked, closed)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["Pending", "Paid", "Cancelled", "booked", "closed"].includes(status)) {
      return res.status(400).json({ message: "Noto'g'ri status kiritildi" });
    }

    if (mongoose.connection.readyState !== 1) {
      const bookings = readFallbackData("bookings");
      const idx = bookings.findIndex(b => b.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ message: "Bron topilmadi" });
      }
      bookings[idx].status = status;
      writeFallbackData("bookings", bookings);

      const spaces = readFallbackData("spaces");
      const space = spaces.find(s => s.id === bookings[idx].space_id);

      const populated = {
        ...bookings[idx],
        space_id: space || { name: "Noma'lum joy" }
      };
      return res.json(populated);
    }

    const booking = await Booking.findById(req.params.id).populate("space_id");
    if (!booking) {
      return res.status(404).json({ message: "Bron topilmadi" });
    }

    booking.status = status;
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: "Statusni o'zgartirishda xatolik yuz berdi", error: error.message });
  }
});

export default router;
