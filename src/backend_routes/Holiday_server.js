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


// ✅ Update Holiday
router.put("/update/:id", (req, res) => {
    const { id } = req.params;
    const { holiday_name, holiday_for, holiday_value, holiday_date, holiday_end, edited_by } = req.body;

    const query = `
        UPDATE holidays SET 
        holiday_name = ?, holiday_for = ?, holiday_value = ?, 
        holiday_date = ?, holiday_end = ?, edited_by = ?, edited_time = NOW()
        WHERE holiday_id = ?
    `;

    db.query(query, [
        holiday_name, holiday_for, holiday_value, holiday_date,
        holiday_end, edited_by, id
    ], (err, result) => {
        if (err) {
            console.error("❌ Update error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Holiday updated" });
    });
});


// ✅ Delete Holiday
router.delete("/delete/:id", (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM holidays WHERE holiday_id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error("❌ Delete error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Holiday deleted" });
    });
});

// ✅ Save Holiday
router.post("/save-holiday", (req, res) => {
    const { holiday_date, holiday_end, holiday_name, holiday_for, holiday_value, created_by } = req.body;

    const query = `
        INSERT INTO holidays 
        (holiday_date, holiday_end, holiday_name, holiday_for, holiday_value, created_by, created_time) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
        query,
        [holiday_date, holiday_end, holiday_name, holiday_for, holiday_value, created_by],
        (err, result) => {
            if (err) {
                console.error("❌ Error saving holiday:", err);
                return res.status(500).json({ error: "Database error" });
            }

            res.json({
                success: true,
                message: "Holiday saved successfully",
                holiday_id: result.insertId
            });
        }
    );
});

module.exports = router;
