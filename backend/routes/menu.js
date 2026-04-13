const router = require("express").Router();

const { MenuItem } = require("../db");
const requireAuth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

// ── GET MENU PUBBLICO ──
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find({ available: true }).sort({
      category: 1,
    });

    res.json(items);
  }),
);

// ── GET MENU ADMIN ──
router.get(
  "/all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find();
    res.json(items);
  }),
);

// ── TOGGLE ──
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
