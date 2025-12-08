require("dotenv").config();
const express = require("express");
const { verifyJWT } = require('./Login_server');
const getDBConnection = require('../../config/db');
const router = express.Router();

const db = getDBConnection('dadmin');

// 🔹 Generate a color based on user name
function generateColorFromText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// 🔹 Get Logined employees
router.get("/logined_employee", verifyJWT, (req, res) => {
  if (!req.emp_id) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  const query = `       
        SELECT 
        e.auto_id, 
        e.emp_id, 
        e.emp_first_name, 
        e.emp_last_name, 
        e.dob, 
        e.blood_group, 
        e.emp_mail_id,
        e.account_pass_text,  
        e.account_pass, 
        e.emp_mobile_no, 
        e.emp_alternate_mobile_no, 
        e.bank_name, 
        e.bank_account_number, 
        e.ifsc_code, 
        e.aadhar_number, 
        e.pan_number, 
        e.passport_number, 
        d.department_name AS 'emp_department', 
        c.level_name AS 'career_level', 
        j.job_name AS 'job_position', 
        t.type_name AS 'emp_type', 
        e.emp_location, 
        e.emp_access_level,  
        e.created_by, 
        e.created_time, 
        e.updated_by, 
        e.updated_time, 
        e.deleted_by, 
        e.deleted_time, 
        e.emp_profile_img, 
        e.app_dAdmin, 
        e.app_dAssist,
        e.app_dBug,
        e.app_dForm,
        e.app_dTime 
        FROM employee e
        LEFT JOIN dadmin.department_config d ON e.emp_department = d.department_id
        LEFT JOIN dadmin.career_level_config c ON e.career_level = c.level_id
        LEFT JOIN dadmin.job_position_config j ON e.job_position =  j.job_id
        LEFT JOIN dadmin.employee_type_config t ON e.emp_type = t.type_id
        WHERE e.emp_id = ? AND e.deleted_by IS NULL
        ORDER BY e.created_time DESC 
    `;

  db.query(query, [req.emp_id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching employees:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // 🟢 Add profile_color for each employee
    const modifiedResults = results.map(emp => {
      // Capitalize first name
      const firstName =
        emp.emp_first_name && emp.emp_first_name.length > 0
          ? emp.emp_first_name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .slice(0, 2)
            .join(' ')
          : '';

      // Generate profile letter & color
      return {
        ...emp,
        emp_first_name: firstName,
        profile_letters: firstName.charAt(0).toUpperCase(),
        profile_color: generateColorFromText(firstName || 'User'),
      };
    });

    res.json(modifiedResults);
  });
});

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

module.exports = router;
