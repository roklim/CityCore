const router = require("express").Router();
const { models } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const { MenuItem } = models;

// ── GET MENU PUBBLICO (frontend clienti) ───────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find({ available: true }).sort({
      category: 1,
    });
    res.json(items);
  }),
);

// ── GET MENU ADMIN (tutto) ─────────────────────
router.get(
  "/all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find();
    res.json(items);
  }),
);

// ── TOGGLE DISPONIBILITÀ ───────────────────────
router.put(
  "/:id/toggle",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Item non trovato" });
    }

    item.available = !item.available;
    await item.save();

    res.json(item);
  }),
);

module.exports = router;
