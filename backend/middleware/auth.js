const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token mancante" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token non valido" });
  }
}

module.exports = { requireAuth };
