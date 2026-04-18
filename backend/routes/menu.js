"use strict";

const router = require("express").Router();
const { MenuItem } = require("../db");
const { requireAuth, requireBusinessRole } = require("../middleware/auth");
const { businessScope, resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

// Tutte le route menu sono tenant-aware: il pubblico vede solo prodotti
// disponibili, l'admin vede anche nascosti/esauriti del proprio business.
router.use(resolveBusiness);

// GET /api/menu — pubblico
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find(businessScope(req, { available: true }))
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .lean();
    res.json(items);
  }),
);

// GET /api/menu/all — admin
router.get(
  "/all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await MenuItem.find(businessScope(req))
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .lean();
    res.json(items);
  }),
);

// POST /api/menu — admin: crea voce
router.post(
  "/",
  requireBusinessRole(["owner", "admin"]),
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      price,
      category,
      emoji,
      imageUrl,
      sortOrder,
      unit,
      tags,
      allergens,
      featured,
    } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "name e price obbligatori" });
    }

    // Il businessId non arriva mai dal client: lo imposta il resolver tenant per
    // evitare inserimenti accidentali o malevoli su altri business.
    const item = await MenuItem.create({
      businessId: req.businessId,
      name,
      description,
      price,
      category,
      emoji,
      imageUrl,
      sortOrder,
      unit,
      tags,
      allergens,
      featured,
    });
    res.status(201).json(item);
  }),
);

// PUT /api/menu/:id — admin: aggiorna voce
router.put(
  "/:id",
  requireBusinessRole(["owner", "admin"]),
  asyncHandler(async (req, res) => {
    // Allowlist esplicita dei campi modificabili dal pannello admin.
    const allowed = [
      "name",
      "description",
      "price",
      "category",
      "emoji",
      "imageUrl",
      "available",
      "sortOrder",
      "unit",
      "tags",
      "allergens",
      "featured",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const item = await MenuItem.findOneAndUpdate(
      businessScope(req, { _id: req.params.id }),
      update,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!item) return res.status(404).json({ error: "Voce non trovata" });
    res.json(item);
  }),
);

// PATCH /api/menu/:id/toggle — admin: toggle disponibilità
router.patch(
  "/:id/toggle",
  requireBusinessRole(["owner", "admin", "staff"]),
  asyncHandler(async (req, res) => {
    // Azione rapida da banco: lo staff puo' segnare prodotti esauriti senza
    // avere permessi completi di modifica menu.
    const item = await MenuItem.findOne(
      businessScope(req, { _id: req.params.id }),
    );
    if (!item) return res.status(404).json({ error: "Voce non trovata" });

    item.available = !item.available;
    await item.save();
    res.json(item);
  }),
);

// DELETE /api/menu/:id — admin
router.delete(
  "/:id",
  requireBusinessRole(["owner", "admin"]),
  asyncHandler(async (req, res) => {
    const item = await MenuItem.findOneAndDelete(
      businessScope(req, { _id: req.params.id }),
    );
    if (!item) return res.status(404).json({ error: "Voce non trovata" });
    res.json({ ok: true });
  }),
);

module.exports = router;
