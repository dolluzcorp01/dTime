require("dotenv").config();
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dTime'); // ✅ Connect to dTime DB

// ✅ Get Holidays for the month
router.get("/list", (req, res) => {
    const { month, year, emp_id } = req.query;

    const query = `
        SELECT 
            h.*, e.emp_department, e.job_position, e.emp_location
        FROM holidays h
        JOIN dadmin.employee e ON e.emp_id = ?
        WHERE MONTH(h.holiday_date) = ?
        AND YEAR(h.holiday_date) = ?
        AND (
            h.holiday_for = 'general'
            OR (h.holiday_for = 'department' AND (h.holiday_value = 'All' OR FIND_IN_SET(e.emp_department, h.holiday_value)))
            OR (h.holiday_for = 'job_position' AND FIND_IN_SET(e.job_position, h.holiday_value))
            OR (h.holiday_for = 'location' AND FIND_IN_SET(e.emp_location, h.holiday_value))
            OR (h.holiday_for = 'employee' AND FIND_IN_SET(e.emp_id, h.holiday_value))
        )
        ORDER BY h.holiday_date ASC
    `;

    db.query(query, [emp_id, month, year], (err, results) => {
        if (err) {
            console.error("❌ Fetch error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

module.exports = router;
