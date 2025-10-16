require("dotenv").config();
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dTime'); // ✅ Connect to dTime DB

// 🔹 Get Punch History for an Employee
router.get("/history/:emp_id", (req, res) => {
    const { emp_id } = req.params;

    const query = `
    SELECT punch_in, punch_out 
    FROM punch_history 
    WHERE emp_id = ?
    ORDER BY auto_id DESC
  `;

    db.query(query, [emp_id], (err, results) => {
        if (err) {
            console.error("❌ Error fetching punch history:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

// 🔹 Punch In (Insert Record)
router.post("/punch-in", (req, res) => {
    const { emp_id } = req.body;

    const query = `
    INSERT INTO punch_history (emp_id, punch_in)
    VALUES (?, NOW())
  `;

    db.query(query, [emp_id], (err, result) => {
        if (err) {
            console.error("❌ Error during punch in:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Punched In", auto_id: result.insertId });
    });
});

// 🔹 Punch Out (Update the latest record which has no punch_out)
router.post("/punch-out", (req, res) => {
    const { emp_id } = req.body;

    const query = `
    UPDATE punch_history 
    SET punch_out = NOW()
    WHERE emp_id = ? AND punch_out IS NULL
    ORDER BY auto_id DESC LIMIT 1
  `;

    db.query(query, [emp_id], (err, result) => {
        if (err) {
            console.error("❌ Error during punch out:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Punched Out" });
    });
});

module.exports = router;
