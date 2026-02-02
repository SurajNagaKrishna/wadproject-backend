const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ================= MYSQL CONNECTION =================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "SUraj123!",
  database: "wadproject"
});

db.connect(err => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("MySQL Connected");
  }
});

// ================= REGISTER ADMIN =================
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.json({
      success: false,
      message: "All fields are required"
    });
  }

  db.query(
    "SELECT * FROM admins WHERE username = ? OR email = ?",
    [username, email],
    async (err, result) => {
      if (err) {
        console.log("REGISTER SELECT ERROR:", err);
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
            console.log("REGISTER INSERT ERROR:", err);
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
        console.log("LOGIN ERROR:", err);
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

// ================= PLACE ORDER (BILLING PAGE) =================
app.post("/place-order", (req, res) => {
  const items = req.body.items;

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No items received"
    });
  }

  // 1️⃣ Create new order
  db.query("INSERT INTO orders () VALUES ()", (err, result) => {
    if (err) {
      console.log("ORDER INSERT ERROR:", err);
      return res.status(500).json({ success: false });
    }

    const orderId = result.insertId;

    // 2️⃣ Insert order items
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
          console.log("ORDER ITEMS ERROR:", err);
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

// ================= CHEF DASHBOARD - FETCH ORDERS =================
app.get("/chef-orders", (req, res) => {
  const query = `
    SELECT 
      o.order_id,
      o.order_time,
      o.status,
      i.item_name,
      i.quantity
    FROM orders o
    JOIN order_items i 
      ON o.order_id = i.order_id
    WHERE o.status = 'PENDING'
    ORDER BY o.order_time ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.log("CHEF FETCH ERROR:", err);
      return res.status(500).json({ success: false });
    }

    res.json(results);
  });
});

// ================= MARK ORDER AS SERVED =================
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
        console.log("SERVE ORDER ERROR:", err);
        return res.status(500).json({ success: false });
      }

      res.json({ success: true });
    }
  );
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});


