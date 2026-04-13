const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let users = [{ username: "admin", password: "1234" }];

let orders = [];

// LOGIN
app.post("/login", (req, res) => {
  const user = users.find(
    (u) => u.username === req.body.username && u.password === req.body.password,
  );
  if (!user) return res.status(401).send("No");
  res.json(user);
});

// GET ORDERS
app.get("/orders", (req, res) => res.json(orders));

// CREATE ORDER (cliente + pizzeria)
app.post("/orders", (req, res) => {
  const order = {
    id: Date.now(),
    customer: req.body.customer,
    phone: req.body.phone,
    items: req.body.items,
    status: "preparing",
  };
  orders.push(order);
  res.json(order);
});

// UPDATE STATUS
app.put("/orders/:id", (req, res) => {
  orders = orders.map((o) =>
    o.id == req.params.id ? { ...o, status: req.body.status } : o,
  );
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server OK"));
