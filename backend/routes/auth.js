"use strict";

const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
const asyncHandler = require("../middleware/asyncHandler");

// Hash calcolato una volta sola all'avvio (non a ogni richiesta)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(config.admin.password, 10);

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username e password obbligatori" });
    }

    const usernameMatch = username === config.admin.username;
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    // Stesso messaggio per username e password errati (no user enumeration)
    if (!usernameMatch || !passwordMatch) {
      return res.status(401).json({ error: "Credenziali errate" });
    }

    const token = jwt.sign({ username, role: "admin" }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({ token, expiresIn: config.jwt.expiresIn });
  }),
);

module.exports = router;
