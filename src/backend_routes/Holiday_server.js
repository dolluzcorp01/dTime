require("dotenv").config();
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dTime'); // ✅ Connect to dTime DB

// ✅ Get Holidays for the month
router.get("/list", (req, res) => {
    const { month, year } = req.query;

    const query = `
        SELECT * FROM holidays 
        WHERE MONTH(holiday_date) = ? AND YEAR(holiday_date) = ?
        ORDER BY holiday_date ASC
    `;

    db.query(query, [month, year], (err, results) => {
        if (err) {
            console.error("❌ Fetch error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

module.exports = router;
