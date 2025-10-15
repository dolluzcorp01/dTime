require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const getDBConnection = require('../../config/db');
const router = express.Router();
const nodemailer = require("nodemailer");
const db = getDBConnection("dadmin");

// 🔹 LOGIN (with bcrypt verification)
router.post("/Verifylogin", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    const query = `SELECT * FROM employee WHERE emp_mail_id = ? AND is_active = 1 AND deleted_time IS NULL`;

    db.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        const employee = results[0];

        // 🔒 Check if password exists (Google users might not have one)
        if (!employee.account_pass || employee.account_pass.trim() === "") {
            return res.status(401).json({ message: "Login with Google instead. Password not set." });
        }

        // 🔹 Verify bcrypt password
        const isPasswordMatch = bcrypt.compareSync(password, employee.account_pass);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Only Admins can log in
        if (employee.emp_access_level !== "Admin") {
            return res.status(403).json({ message: "Access denied. Only admins can login." });
        }

        // ✅ Successful login
        return res.json({ message: "Login successful", employee });
    });
});

// ✅ VERIFY OLD PASSWORD (with bcrypt)
router.post("/verify-old-password", (req, res) => {
    const { emp_id, oldPass } = req.body;

    if (!emp_id) {
        return res.status(400).json({ message: "Employee session expired" });
    }

    const query = `SELECT * FROM employee WHERE emp_id = ? AND deleted_time IS NULL`;

    db.query(query, [emp_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "User not found" });

        const employee = results[0];

        // 🔒 Verify bcrypt password
        const isPasswordMatch = bcrypt.compareSync(oldPass, employee.account_pass);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Old password is incorrect" });
        }

        return res.json({ message: "Old password verified", emp_id: employee.emp_id });
    });
});

// ✅ UPDATE PASSWORD (encrypt before saving)
router.post("/update-password", (req, res) => {
    const { emp_id, email, newPass } = req.body;

    if (!emp_id && !email) {
        return res.status(400).json({ message: "Employee info expired" });
    }

    // 🔹 Encrypt new password using bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPass, salt);

    const query = emp_id
        ? `UPDATE employee SET account_pass = ?, updated_time = NOW() WHERE emp_id = ?`
        : `UPDATE employee SET account_pass = ?, updated_time = NOW() WHERE emp_mail_id = ?`;

    const identifier = emp_id || email;

    db.query(query, [hashedPassword, identifier], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({ message: "Password updated successfully" });
    });
});

// ✅ Send OTP API with Employee Validation
router.post("/send-otp", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    // ✅ Check if Employee exists
    const query = `SELECT * FROM employee WHERE emp_mail_id = ? AND deleted_time IS NULL`;
    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "Employee not found" });

        // ✅ Employee exists → Generate OTP
        generateOTP(email, res);
    });
});

// 🔹 Generate OTP Function
const generateOTP = (userInput, res) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 5 * 60000);

    const query = `INSERT INTO otpstorage (UserInput, OTP, ExpiryTime) VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE OTP = ?, ExpiryTime = ?`;

    db.query(query, [userInput, otp, expiryTime, otp, expiryTime], async (err) => {
        if (err) {
            console.error('❌ Error in generateOTP:', err);
            return res.status(500).json({ message: 'Error generating OTP' });
        }

        // 🔹 Send OTP via Email
        const transporter = nodemailer.createTransport({
            host: "smtp.zoho.in",
            port: 587,
            secure: false,
            auth: {
                user: "support@dolluzcorp.in",
                pass: "KebcfG6SUTnx",
            },
        });

        const mailOptions = {
            from: '"dTime Support" <support@dolluzcorp.in>',
            to: userInput,
            subject: "dTime Password Reset - Your OTP Code",
            html: `
    <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4A90E2;">dTime - One Time Password (OTP)</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password on <strong>dTime</strong>.</p>
      <p>Please use the following OTP to verify your identity:</p>
      <h3 style="color: #333; font-size: 24px;">${otp}</h3>
      <p>This OTP is valid for <strong>2 minutes</strong>. Do not share this code with anyone.</p>
      <p>If you did not request a password reset, please ignore this message.</p>
      <br/>
      <p style="color: #888;">-The dTime Team</p>
    </div>
  `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ message: "OTP sent successfully" });
        } catch (error) {
            console.error("❌ Error sending OTP email:", error);
            res.status(500).json({ message: "Failed to send OTP email" });
        }
    });
};

// ✅ Verify OTP API
router.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP required" });
    }

    const query = `SELECT * FROM otpstorage WHERE UserInput = ?`;

    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "OTP not found" });

        const storedOtp = results[0];

        if (storedOtp.OTP !== otp) {
            return res.status(401).json({ message: "Invalid OTP" });
        }

        if (new Date() > new Date(storedOtp.ExpiryTime)) {
            return res.status(410).json({ message: "OTP expired" });
        }

        return res.json({ message: "OTP verified" });
    });
});

module.exports = router;
