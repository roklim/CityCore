const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");

const asyncHandler = require("../middleware/asyncHandler");

// demo user
const ADMIN = {
  username: "admin",
  password: bcrypt.hashSync("admin123", 10),
};

// LOGIN
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (username !== ADMIN.username) {
      return res.status(401).json({ error: "Credenziali errate" });
    }

    const ok = await bcrypt.compare(password, ADMIN.password);

    if (!ok) {
      return res.status(401).json({ error: "Credenziali errate" });
    }

    const token = jwt.sign({ username, role: "admin" }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({ token });
  }),
);

module.exports = router;
