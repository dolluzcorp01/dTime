require("dotenv").config();
const express = require("express");
const { verifyJWT } = require('./Login_server');
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dtime');

// 🔹 Get all active projects
router.get("/all", (req, res) => {
    const query = `
    SELECT * FROM project_details
    WHERE deleted_by IS NULL
    ORDER BY created_time DESC
  `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Get all tasks for a project
router.get("/tasks/:project_id", (req, res) => {
    const { project_id } = req.params;
    const query = `
        SELECT * FROM task_details
        WHERE project_id = ? AND deleted_by IS NULL
        ORDER BY created_time DESC
    `;
    db.query(query, [project_id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

module.exports = router;
