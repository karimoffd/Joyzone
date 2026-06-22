import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { readFallbackData, writeFallbackData } from "../utils/fallbackDb.js";

const router = express.Router();

// GET all users
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const users = readFallbackData("users");
      return res.json(users);
    }
    const users = await User.find().sort({ lastLogin: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server xatoligi", error: error.message });
  }
});

// POST user login / auto-register
router.post("/login", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Ism va Email kiritilishi shart." });
    }

    if (mongoose.connection.readyState !== 1) {
      const users = readFallbackData("users");
      let user = users.find(u => u.email === email.toLowerCase().trim());
      
      if (!user) {
        user = {
          id: "user-" + Date.now(),
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: "User",
          isOnline: true,
          lastLogin: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        users.unshift(user);
      } else {
        user.name = name.trim();
        user.isOnline = true;
        user.lastLogin = new Date().toISOString();
      }

      writeFallbackData("users", users);

      // Emit socket event to notify admin dashboard
      const io = req.app.get("socketio");
      if (io) {
        io.emit("user_login", user);
      }

      return res.status(200).json(user);
    }

    // Find or create user in MongoDB
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        isOnline: true,
        lastLogin: new Date()
      });
    } else {
      user.name = name.trim();
      user.isOnline = true;
      user.lastLogin = new Date();
    }

    const savedUser = await user.save();

    // Emit socket event to notify admin dashboard
    const io = req.app.get("socketio");
    if (io) {
      io.emit("user_login", savedUser);
    }

    res.status(200).json(savedUser);
  } catch (error) {
    res.status(400).json({ message: "Login qilishda xatolik yuz berdi.", error: error.message });
  }
});

// POST user logout
router.post("/logout", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email kiritilishi shart." });
    }

    if (mongoose.connection.readyState !== 1) {
      const users = readFallbackData("users");
      const user = users.find(u => u.email === email.toLowerCase().trim());
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi." });
      }

      user.isOnline = false;
      writeFallbackData("users", users);

      // Emit socket event to notify admin dashboard
      const io = req.app.get("socketio");
      if (io) {
        io.emit("user_logout", user);
      }

      return res.status(200).json({ message: "Tizimdan muvaffaqiyatli chiqildi.", user });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi." });
    }

    user.isOnline = false;
    const savedUser = await user.save();

    // Emit socket event to notify admin dashboard
    const io = req.app.get("socketio");
    if (io) {
      io.emit("user_logout", savedUser);
    }

    res.status(200).json({ message: "Tizimdan muvaffaqiyatli chiqildi.", user: savedUser });
  } catch (error) {
    res.status(400).json({ message: "Logout qilishda xatolik yuz berdi.", error: error.message });
  }
});

export default router;
