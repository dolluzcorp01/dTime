require("dotenv").config();
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dadmin');

// 🔹 Get all employees
router.get("/all", (req, res) => {
  const query = `
    SELECT * 
    FROM employee
    WHERE deleted_by IS NULL AND is_active = '1'
    ORDER BY created_time DESC 
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching employees:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
