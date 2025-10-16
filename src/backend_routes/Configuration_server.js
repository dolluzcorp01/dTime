require("dotenv").config();
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dTime');

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

// 🔹 Insert Project (With Manual PRJ Logic)
router.post("/add", (req, res) => {
    const { project_name, created_by } = req.body;

    // Step 1: Get last auto_id to calculate next project ID
    db.query(`SELECT auto_id FROM project_details ORDER BY auto_id DESC LIMIT 1`, (err, result) => {
        if (err) return res.status(500).json({ error: err });

        const nextId = result.length > 0 ? result[0].auto_id + 1 : 1;
        const project_id = `PRJ-${String(nextId).padStart(4, '0')}`; // Format: PRJ-0001

        // Step 2: Insert with auto-generated project_id
        const query = `INSERT INTO project_details (project_id, project_name, created_by) VALUES (?, ?, ?)`;

        db.query(query, [project_id, project_name, created_by], (err2, result2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.json({ success: true, auto_id: result2.insertId, project_id });
        });
    });
});

// 🔹 Update Project
router.put("/update/:auto_id", (req, res) => {
    const { auto_id } = req.params;
    const { project_name, updated_by } = req.body;
    const query = `
    UPDATE project_details
    SET project_name = ?, updated_by = ?
    WHERE auto_id = ?
  `;
    db.query(query, [project_name, updated_by, auto_id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

// 🔹 Soft Delete Project
router.delete("/delete/:auto_id", (req, res) => {
    const { auto_id } = req.params;
    const { deleted_by } = req.body;
    const query = `
    UPDATE project_details
    SET deleted_by = ?, deleted_time = NOW()
    WHERE auto_id = ?
  `;
    db.query(query, [deleted_by, auto_id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

// ===== Task Details CRUD =====

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

// Insert Task
router.post("/tasks/add", (req, res) => {
    const { project_id, task_desc, created_by } = req.body;
    const query = `
        INSERT INTO task_details (project_id, task_desc, created_by)
        VALUES (?, ?, ?)
    `;
    db.query(query, [project_id, task_desc, created_by], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, auto_id: result.insertId });
    });
});

// Update Task
router.put("/tasks/update/:auto_id", (req, res) => {
    const { auto_id } = req.params;
    const { task_desc, updated_by } = req.body;
    const query = `
        UPDATE task_details
        SET task_desc = ?, updated_by = ?
        WHERE auto_id = ?
    `;
    db.query(query, [task_desc, updated_by, auto_id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

// Soft Delete Task
router.delete("/tasks/delete/:auto_id", (req, res) => {
    const { auto_id } = req.params;
    const { deleted_by } = req.body;
    const query = `
        UPDATE task_details
        SET deleted_by = ?, deleted_time = NOW()
        WHERE auto_id = ?
    `;
    db.query(query, [deleted_by, auto_id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

module.exports = router;
