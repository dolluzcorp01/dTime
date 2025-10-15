
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();
const bcrypt = require("bcryptjs");

const db = getDBConnection('dadmin');

// 🔹 Get all employees
router.get("/all", (req, res) => {
  const query = `
    SELECT * 
    FROM employee
    WHERE deleted_by IS NULL 
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

// Create employee
router.post("/create", (req, res) => {
  const emp = req.body;

  // 🔹 Encrypt (hash) the password before inserting
  let hashedPassword = null;
  if (emp.account_pass && emp.account_pass.trim() !== "") {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(emp.account_pass, salt);
  }

  // First insert without emp_id
  const insertQuery = `
    INSERT INTO employee (
      emp_id, emp_first_name, emp_last_name, dob, blood_group, 
      emp_mail_id, account_pass, emp_mobile_no, emp_alternate_mobile_no, 
      emp_department, emp_type, carrier_level, job_position,
      emp_location, emp_access_level, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const placeholderEmpId = "TEMP";

  db.query(
    insertQuery,
    [
      placeholderEmpId,
      emp.emp_first_name, emp.emp_last_name, emp.dob, emp.blood_group,
      emp.emp_mail_id, hashedPassword, emp.emp_mobile_no, emp.emp_alternate_mobile_no,
      emp.emp_department, emp.emp_type, emp.carrier_level, emp.job_position,
      emp.emp_location, emp.emp_access_level, emp.created_by
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const autoId = result.insertId;
      const currentYear = new Date().getFullYear();
      const formattedEmpId = `dolluzcorp-${currentYear}-${String(autoId).padStart(5, "0")}`;

      const updateQuery = `UPDATE employee SET emp_id = ? WHERE auto_id = ?`;

      db.query(updateQuery, [formattedEmpId, autoId], (err2) => {
        if (err2) return res.status(500).json({ error: "Failed to update emp_id" });

        res.json({ success: true, emp_id: formattedEmpId });
      });
    }
  );
});

// Update employee
router.put("/update/:id", (req, res) => {
  const emp = req.body;
  const query = `
    UPDATE employee 
    SET 
      emp_first_name=?, emp_last_name=?, dob=?, blood_group=?,
      emp_mail_id=?, emp_mobile_no=?, emp_alternate_mobile_no=?,
      emp_department=?, emp_type=?, carrier_level=?, job_position=?,
      emp_location=?, emp_access_level=?, updated_by=?
    WHERE emp_id=?
  `;

  db.query(
    query,
    [
      emp.emp_first_name, emp.emp_last_name, emp.dob, emp.blood_group,
      emp.emp_mail_id, emp.emp_mobile_no, emp.emp_alternate_mobile_no,
      emp.emp_department, emp.emp_type, emp.carrier_level, emp.job_position,
      emp.emp_location, emp.emp_access_level, emp.updated_by,
      req.params.id
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Soft delete
router.put("/delete/:id", (req, res) => {
  const { deleted_by } = req.body;
  const query = `UPDATE employee SET deleted_by=?, deleted_time=NOW() WHERE emp_id=?`;
  db.query(query, [deleted_by, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Update employee active status
router.put("/toggle-active/:id", (req, res) => {
  const { is_active, updated_by } = req.body;
  const query = `UPDATE employee SET is_active=?, is_active_updated_by=?, is_active_updated_time=NOW() WHERE emp_id=?`;
  db.query(query, [is_active, updated_by, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
