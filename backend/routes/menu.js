"use strict";

const router = require("express").Router();
const { MenuItem } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/menu — pubblico
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find({ available: true })
      .sort({ category: 1, name: 1 })
      .lean();
    res.json(items);
  }),
);

// GET /api/menu/all — admin
router.get(
  "/all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find().sort({ category: 1, name: 1 }).lean();
    res.json(items);
  }),
);

// POST /api/menu — admin: crea voce
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description, price, category, emoji } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "name e price obbligatori" });
    }

    const item = await MenuItem.create({
      name,
      description,
      price,
      category,
      emoji,
    });
    res.status(201).json(item);
  }),
);

// PUT /api/menu/:id — admin: aggiorna voce
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = [
      "name",
      "description",
      "price",
      "category",
      "emoji",
      "available",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!item) return res.status(404).json({ error: "Voce non trovata" });
    res.json(item);
  }),
);

// PATCH /api/menu/:id/toggle — admin: toggle disponibilità
router.patch(
  "/:id/toggle",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Voce non trovata" });

    item.available = !item.available;
    await item.save();
    res.json(item);
  }),
);

// DELETE /api/menu/:id — admin
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Voce non trovata" });
    res.json({ ok: true });
  }),
);

module.exports = router;
