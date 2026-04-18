"use strict";

const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { Business, User } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

// Legacy fallback: keeps the existing env-based platform admin working while
// Mongo-backed users are introduced for each business.
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(config.admin.password, 10);

// Non esponiamo mai passwordHash o dettagli interni del documento User.
function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
  };
}

// Payload minimo del tenant da salvare nella sessione frontend admin.
function publicBusiness(business) {
  if (!business) return null;
  return {
    _id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    plan: business.plan,
    subscriptionStatus: business.subscriptionStatus,
    branding: business.branding,
    features: business.features,
    settings: business.settings,
  };
}

// Il JWT porta businessId/businessSlug: e' la fonte di verita per bloccare un
// owner/admin/staff sul proprio business anche se prova a cambiare URL/header.
function signToken({ user, business }) {
  const payload = {
    userId: user._id ? String(user._id) : undefined,
    username: user.username,
    email: user.email,
    role: user.role,
    businessId: business?._id ? String(business._id) : undefined,
    businessSlug: business?.slug,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const {
      username = "",
      email = "",
      password = "",
      businessSlug = "",
    } = req.body || {};
    const identifier = String(email || username).trim().toLowerCase();

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Email/username e password obbligatori" });
    }

    // Primo ramo: admin globale legacy da .env, utile per bootstrap e gestione
    // piattaforma anche prima di avere un utente Mongo global_admin.
    const legacyUsernameMatch = identifier === config.admin.username.toLowerCase();
    const legacyPasswordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (legacyUsernameMatch && legacyPasswordMatch) {
      const token = signToken({
        user: {
          username: config.admin.username,
          role: "global_admin",
        },
      });

      return res.json({
        token,
        role: "global_admin",
        user: {
          name: "Platform Admin",
          email: "",
          role: "global_admin",
        },
        business: null,
        expiresIn: config.jwt.expiresIn,
      });
    }

    // Secondo ramo: utenti Mongo per singolo business. Se arriva businessSlug,
    // il login viene vincolato a quel tenant e non cerca email in altri business.
    const userFilter = { email: identifier, active: true };
    if (businessSlug) {
      const business = await Business.findOne({ slug: businessSlug }).lean();
      if (!business) return res.status(401).json({ error: "Credenziali errate" });
      userFilter.businessId = business._id;
    }

    const user = await User.findOne(userFilter);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Credenziali errate" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenziali errate" });
    }

    const business = user.businessId
      ? await Business.findById(user.businessId).lean()
      : null;

    if (user.role !== "global_admin" && !business) {
      return res.status(403).json({ error: "Business utente non valido" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({ user, business });

    res.json({
      token,
      role: user.role,
      user: publicUser(user),
      business: publicBusiness(business),
      expiresIn: config.jwt.expiresIn,
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    // I token legacy del global admin non hanno userId Mongo: rispondiamo con
    // una sessione sintetica ma coerente col resto del frontend.
    if (req.user?.role === "global_admin" && !req.user.userId) {
      return res.json({
        user: {
          name: "Platform Admin",
          role: "global_admin",
        },
        business: null,
      });
    }

    const user = await User.findById(req.user.userId).lean();
    if (!user || !user.active) {
      return res.status(401).json({ error: "Utente non valido" });
    }

    const business = user.businessId
      ? await Business.findById(user.businessId).lean()
      : null;

    res.json({
      user: publicUser(user),
      business: publicBusiness(business),
    });
  }),
);

module.exports = router;
