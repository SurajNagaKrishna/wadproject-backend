const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ================= MYSQL CONNECTION =================
// ✅ Use ENV variables (Render-compatible)
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "SUraj123!",
  database: process.env.DB_NAME || "wadproject"
});

db.connect(err => {
  if (err) {
    console.error("DB Error:", err.message);
  } else {
    console.log("MySQL Connected");
  }
});

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ================= REGISTER ADMIN =================
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.json({ success: false, message: "All fields are required" });
  }

  db.query(
    "SELECT * FROM admins WHERE username = ? OR email = ?",
    [username, email],
    async (err, result) => {
      if (err) {
        console.error("REGISTER SELECT ERROR:", err);
        return res.json({ success: false });
      }

      if (result.length > 0) {
        return res.json({
          success: false,
          message: "Admin already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "INSERT INTO admins (username, password, email) VALUES (?, ?, ?)",
        [username, hashedPassword, email],
        err => {
          if (err) {
            console.error("REGISTER INSERT ERROR:", err);
            return res.json({ success: false });
          }

          res.json({
            success: true,
            message: "Admin registered successfully"
          });
        }
      );
    }
  );
});

// ================= LOGIN ADMIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({
      success: false,
      message: "All fields are required"
    });
  }

  db.query(
    "SELECT * FROM admins WHERE username = ?",
    [username],
    async (err, result) => {
      if (err) {
        console.error("LOGIN ERROR:", err);
        return res.json({ success: false });
      }

      if (result.length === 0) {
        return res.json({
          success: false,
          message: "Admin not found"
        });
      }

      const match = await bcrypt.compare(password, result[0].password);

      if (!match) {
        return res.json({
          success: false,
          message: "Wrong password"
        });
      }

      res.json({
        success: true,
        message: "Login successful"
      });
    }
  );
});

// ================= PLACE ORDER =================
app.post("/place-order", (req, res) => {
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No items received"
    });
  }

  // Create order
  db.query("INSERT INTO orders () VALUES ()", (err, result) => {
    if (err) {
      console.error("ORDER INSERT ERROR:", err);
      return res.status(500).json({ success: false });
    }

    const orderId = result.insertId;

    const values = items.map(item => [
      orderId,
      item.name,
      item.qty,
      item.price
    ]);

    db.query(
      "INSERT INTO order_items (order_id, item_name, quantity, price) VALUES ?",
      [values],
      err => {
        if (err) {
          console.error("ORDER ITEMS ERROR:", err);
          return res.status(500).json({ success: false });
        }

        res.json({
          success: true,
          orderId
        });
      }
    );
  });
});

// ================= CHEF ORDERS =================
app.get("/chef-orders", (req, res) => {
  const query = `
    SELECT 
      o.order_id,
      o.order_time,
      o.status,
      i.item_name,
      i.quantity
    FROM orders o
    JOIN order_items i ON o.order_id = i.order_id
    WHERE o.status = 'PENDING'
    ORDER BY o.order_time ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("CHEF FETCH ERROR:", err);
      return res.json([]);
    }

    res.json(results);
  });
});

// ================= SERVE ORDER =================
app.post("/serve-order", (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false });
  }

  db.query(
    "UPDATE orders SET status = 'SERVED' WHERE order_id = ?",
    [orderId],
    err => {
      if (err) {
        console.error("SERVE ORDER ERROR:", err);
        return res.status(500).json({ success: false });
      }

      res.json({ success: true });
    }
  );
});

// ================= SERVER =================
// ✅ REQUIRED for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
