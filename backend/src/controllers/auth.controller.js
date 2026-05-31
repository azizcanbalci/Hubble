import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { upsertStreamUser, addUserToPublicChannels } from "../config/stream.js";
import { ENV } from "../config/env.js";

const signToken = (userId) =>
  jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "30d" });

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Ad, email ve şifre zorunludur" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Bu email adresi zaten kullanımda" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashed,
      authProvider: "local",
      image: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    });

    await upsertStreamUser({
      id: user._id.toString(),
      name: user.name,
      image: user.image,
    });

    await addUserToPublicChannels(user._id.toString());

    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Kayıt sırasında bir hata oluştu" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email ve şifre zorunludur" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), authProvider: "local" });
    if (!user) {
      return res.status(401).json({ message: "Email veya şifre hatalı" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Email veya şifre hatalı" });
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Giriş sırasında bir hata oluştu" });
  }
};
