const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 👇 LOG DEBUG (importantissimo su Render)
app.use((req, res, next) => {
  console.log(req.method, req.url, req.body);
  next();
});

// USERS (demo)
const users = [{ username: "admin", password: "1234" }];

// ORDERS (RAM - poi si migliora con DB)
let orders = [];

// -------------------- LOGIN --------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) return res.status(401).json({ error: "Invalid login" });

  res.json({ username: user.username });
});

// -------------------- GET ORDERS --------------------
app.get("/orders", (req, res) => {
  res.json(orders);
});

// -------------------- CREATE ORDER --------------------
app.post("/orders", (req, res) => {
  const { customer, phone, items } = req.body;

  // VALIDAZIONE BASE
  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing data" });
  }

  const order = {
    id: Date.now(),
    customer,
    phone: phone || "",
    items,
    status: "preparing",
    createdAt: new Date(),
  };

  orders.push(order);

  res.json(order);
});

// -------------------- UPDATE STATUS --------------------
app.put("/orders/:id", (req, res) => {
  const { status } = req.body;

  if (!status) return res.status(400).send("Missing status");

  orders = orders.map((o) => (o.id == req.params.id ? { ...o, status } : o));

  res.sendStatus(200);
});

// -------------------- START --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));
