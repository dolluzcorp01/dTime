require("dotenv").config();
const express = require("express");
const { verifyJWT } = require('./Login_server');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const router = express.Router();
const getDBConnection = require("../../config/db");
const db = getDBConnection("dTime");

// 🔹 Mail Transporter (Zoho)
const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 587,
    secure: false,
    auth: {
        user: "support@dolluzcorp.in",
        pass: "KebcfG6SUTnx",
    },
});

// ✅ 1. Get all leave types
router.get("/leave_type_list", (req, res) => {
    const query = `
        SELECT * FROM leave_type 
        WHERE deleted_time IS NULL 
     `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Fetch error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

// ✅ Get leave requests only for a specific employee
router.get("/my_leave_request_list", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const empId = req.emp_id;

    const query = `
        SELECT lr.*, lt.leave_type 
        FROM leave_requests lr 
        LEFT JOIN leave_type lt ON lr.leave_type_id = lt.leave_type_id
        WHERE lr.emp_id = ?
        ORDER BY lr.created_time DESC
    `;

    db.query(query, [empId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// 📁 Folder where files are stored
const uploadPath = "leave_attachments/";
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
        const empId = req.body.emp_id || "unknown";
        const fileName = `${empId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, fileName);
    },
});
const upload = multer({ storage });

// ✅ Add Leave Request + Notify
router.post("/add_my_leave_request", upload.single("attachment"), verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    const {
        leave_type_id,
        start_date,
        start_date_breakdown,
        end_date,
        end_date_breakdown,
        leave_description,
    } = req.body;

    if (!emp_id || emp_id === "null" || emp_id === "undefined") {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const attachmentPath = req.file
        ? path.join(uploadPath, req.file.filename).replace(/\\/g, "\\")
        : null;

    const insertQuery = `
        INSERT INTO leave_requests
        (emp_id, leave_type_id, start_date, start_date_breakdown, end_date, end_date_breakdown, attachment, leave_description, leave_status, created_by, created_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW())
    `;

    db.query(
        insertQuery,
        [
            emp_id,
            leave_type_id,
            start_date,
            start_date_breakdown,
            end_date,
            end_date_breakdown,
            attachmentPath,
            leave_description,
            emp_id,
        ],
        (err) => {
            if (err) {
                console.error("❌ DB Insert Error:", err);
                return res.status(500).json({ error: "Database error" });
            }

            // 📨 Once inserted successfully, send mail to approver/admin
            sendLeaveNotification(emp_id, start_date, end_date, leave_description);
            res.json({ success: true, message: "Leave request submitted successfully" });
        }
    );
});

// 🔹 Send Leave Notification
const sendLeaveNotification = (emp_id, start_date, end_date, leave_description) => {
    const empQuery = `
    SELECT e.emp_mail_id, e.emp_department, d.department_name, CONCAT(e.emp_first_name, ' ', e.emp_last_name) AS emp_name 
    FROM dadmin.employee e
    LEFT JOIN dadmin.department_config d ON d.department_id = e.emp_department 
    WHERE e.emp_id = ?`;

    db.query(empQuery, [emp_id], (err, empResult) => {
        if (err || empResult.length === 0) return console.error("❌ Employee fetch error:", err);

        const { emp_mail_id, emp_department, department_name, emp_name } = empResult[0];

        // 🔸 Find department ID in leave_approval
        const deptQuery = `SELECT * FROM leave_approval WHERE department_id = ?`;
        db.query(deptQuery, [emp_department], (err, approvalResult) => {
            if (err) return console.error("❌ Leave approval fetch error:", err);

            let recipientEmail = "admin@dolluzcorp.in";
            let emailSubject = "New Leave Request Submitted";
            let emailBody = "";

            if (approvalResult.length > 0 && approvalResult[0].level_1) {
                const level1EmpId = approvalResult[0].level_1;

                // 🔸 Fetch Level 1 approver email
                const approverQuery = `SELECT emp_mail_id, CONCAT(emp_first_name, ' ', emp_last_name) AS approver_name FROM dadmin.employee WHERE emp_id = ?`;
                db.query(approverQuery, [level1EmpId], (err, approverResult) => {
                    if (err || approverResult.length === 0) {
                        console.error("⚠️ Approver not found, sending to admin.");
                        return sendMail(
                            "admin@dolluzcorp.in",
                            "Leave Approval Not Configured",
                            buildNoApprovalMail(emp_name, department_name, start_date, end_date, leave_description)
                        );
                    }

                    const { emp_mail_id: approverMail, approver_name } = approverResult[0];

                    // 🔸 Build mail for approver
                    const mailContent = `
                        <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                            <h2 style="color:#4A90E2;">New Leave Request Submitted</h2>
                            <p>Dear ${approver_name},</p>
                            <p><strong>${emp_name}</strong> has applied for leave from 
                            <strong>${start_date}</strong> to <strong>${end_date}</strong>.</p>
                            <p><em>Reason:</em> ${leave_description || "No description provided."}</p>
                            <p>Please review this leave request in the dTime portal.</p>
                            <br/>
                            <p style="color:#888;">- dTime System</p>
                        </div>
                    `;

                    sendMail(approverMail, emailSubject, mailContent);
                });
            } else {
                // 🔸 No approval setup found
                const noApprovalContent = buildNoApprovalMail(emp_name, department_name, start_date, end_date, leave_description);
                sendMail(recipientEmail, "Leave Approval Not Configured", noApprovalContent);
            }
        });
    });
};

// 🔹 Mail Builder for no approval setup
const buildNoApprovalMail = (emp_name, department_name, start_date, end_date, leave_description) => `
    <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color:#4A90E2;">Leave Approval Not Configured</h2>
        <p>Hello Admin,</p>
        <p>A leave request has been submitted by <strong>${emp_name}</strong> from 
        <strong>${start_date}</strong> to <strong>${end_date}</strong>.</p>
        <p><em>Reason:</em> ${leave_description || "No description provided."}</p>
        <p><strong>Note:</strong> This department (<strong>${department_name}</strong>) does not have leave approval levels configured in the system.</p>
        <br/>
        <p style="color:#888;">- dTime System</p>
    </div>
`;

// 🔹 Common Mail Sender
const sendMail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: '"dTime Notifications" <support@dolluzcorp.in>',
            to,
            subject,
            html,
        });
        console.log(`📧 Mail sent to ${to}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

// 🔹 Cron job runs every day at 9 AM
cron.schedule("0 12 * * *", () => {
    console.log("⏰ Running leave request escalation check at 12 PM...");
    escalatePendingLeaveRequests();
});

const escalatePendingLeaveRequests = () => {
    const fetchQuery = `
        SELECT lr.leave_requests_id, lr.emp_id, lr.leave_status, lr.created_time,
               la.level_1, la.level_2, la.level_3, e.emp_department,
               TIMESTAMPDIFF(DAY, lr.created_time, NOW()) AS days_pending
        FROM leave_requests lr
        JOIN dadmin.employee e ON lr.emp_id = e.emp_id
        LEFT JOIN leave_approval la ON la.department_id = e.emp_department
        WHERE lr.leave_status = 'Pending';
    `;

    db.query(fetchQuery, (err, requests) => {
        if (err) {
            console.error("❌ Error fetching pending leaves:", err);
            return;
        }

        requests.forEach(req => {
            const { leave_requests_id, emp_id, level_1, level_2, level_3, days_pending } = req;

            if (days_pending === 2) {
                // Notify Level 2
                notifyApprover(level_2, emp_id, leave_requests_id, "Level 2 escalation");
            } else if (days_pending === 4) {
                // Notify Level 3
                notifyApprover(level_3, emp_id, leave_requests_id, "Level 3 escalation");
            } else if (days_pending >= 5) {
                // Auto-approve after 1 more day
                autoApproveLeave(leave_requests_id, emp_id);
            }
        });
    });
};

const notifyApprover = (approverId, emp_id, leave_requests_id, stage) => {
    if (!approverId) return;

    const empQuery = `
        SELECT emp_mail_id, CONCAT(emp_first_name, ' ', emp_last_name) AS emp_name
        FROM dadmin.employee WHERE emp_id = ?`;
    const approverQuery = `
        SELECT emp_mail_id, CONCAT(emp_first_name, ' ', emp_last_name) AS approver_name
        FROM dadmin.employee WHERE emp_id = ?`;

    db.query(empQuery, [emp_id], (err, empResult) => {
        if (err || empResult.length === 0) return;
        const { emp_name } = empResult[0];

        db.query(approverQuery, [approverId], (err, approverResult) => {
            if (err || approverResult.length === 0) return;

            const { emp_mail_id: approverMail, approver_name } = approverResult[0];

            const html = `
                <div style="font-family: Arial; padding: 10px; border: 1px solid #ddd;">
                    <h3 style="color: #4A90E2;">${stage}</h3>
                    <p>Dear ${approver_name},</p>
                    <p>The leave request for <strong>${emp_name}</strong> is still pending approval.</p>
                    <p>Leave request Id <strong>${leave_requests_id}</strong></p>
                    <p>Please review it at your earliest convenience.</p>
                    <p style="color:#888;">- dTime System</p>
                </div>
            `;
            sendMail(approverMail, `Leave Escalation - ${stage}`, html);
        });
    });
};

const autoApproveLeave = (leave_requests_id, emp_id) => {
    const updateQuery = `
        UPDATE leave_requests 
        SET leave_status = 'Approved', status_updated_by = 'dAssist-2025-00001', 
        status_updated_reason = 'Expired request auto updated', status_updated_time = NOW()
        WHERE leave_requests_id = ?;
    `;
    db.query(updateQuery, [leave_requests_id], (err) => {
        if (err) return console.error("❌ Auto-approval error:", err);

        // Fetch employee email to notify
        const empQuery = `SELECT emp_mail_id, CONCAT(emp_first_name, ' ', emp_last_name) AS emp_name FROM dadmin.employee WHERE emp_id = ?`;
        db.query(empQuery, [emp_id], (err, empResult) => {
            if (err || empResult.length === 0) return;
            const { emp_mail_id, emp_name } = empResult[0];

            const html = `
                <div style="font-family: Arial; padding: 10px; border: 1px solid #ddd;">
                    <h3 style="color: #4A90E2;">Leave Auto-Approved</h3>
                    <p>Dear ${emp_name},</p>
                    <p>Your leave request was automatically approved due to no response from approvers.</p>
                    <p style="color:#888;">- dTime System</p>
                </div>
            `;
            sendMail(emp_mail_id, "Leave Request Auto-Approved", html);
        });
    });
};

// ✅ Update request (safe and clean)
router.put("/update_my_leave_request/:id", upload.single("attachment"), verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;
    const { id } = req.params;
    const {
        leave_type_id,
        start_date,
        start_date_breakdown,
        end_date,
        end_date_breakdown,
        leave_description,
        removeOldAttachment,
    } = req.body;

    if (!emp_id || emp_id === "null" || emp_id === "undefined") {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const newAttachment = req.file
        ? path.join(uploadPath, req.file.filename).replace(/\\/g, "\\")
        : null;

    db.query(`SELECT attachment FROM leave_requests WHERE leave_requests_id=?`, [id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const oldAttachment = results.length ? results[0].attachment : null;

        // ✅ If user removed the old file manually
        if (removeOldAttachment === "true" && oldAttachment && fs.existsSync(oldAttachment)) {
            fs.unlinkSync(oldAttachment);
        }

        // ✅ If a new file uploaded, delete the old one
        if (newAttachment && oldAttachment && fs.existsSync(oldAttachment)) {
            fs.unlinkSync(oldAttachment);
        }

        // ✅ Build update query
        let attachmentPart = "";
        const params = [
            leave_type_id,
            start_date,
            start_date_breakdown,
            end_date,
            end_date_breakdown,
            leave_description,
        ];

        if (removeOldAttachment === "true") {
            attachmentPart = "attachment=NULL,";
        } else if (newAttachment) {
            attachmentPart = "attachment=?,";
            params.push(newAttachment);
        }

        params.push(id);

        const query = `
            UPDATE leave_requests
            SET leave_type_id=?, start_date=?, start_date_breakdown=?, end_date=?, end_date_breakdown=?, 
                leave_description=?, ${attachmentPart} leave_status= 'Pending' 
            WHERE leave_requests_id=?`;

        db.query(query, params, (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ success: true, message: "Leave request updated successfully" });
        });
    });
});

// ✅ Cancel leave request (just update status)
router.put("/cancel_my_leave_request/:id", (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const canceled_by = req.emp_id;

    const { id } = req.params;

    if (!canceled_by || canceled_by === "null" || canceled_by === "undefined") {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const query = `
        UPDATE leave_requests
        SET leave_status = 'Canceled',
            canceled_by = ?,
            canceled_time = NOW()
        WHERE leave_requests_id = ?
    `;

    db.query(query, [canceled_by, id], (err, result) => {
        if (err) {
            console.error("❌ Cancel error:", err);
            return res.status(500).json({ error: "Database error while canceling leave" });
        }

        res.json({
            success: true,
            message: "Leave request canceled successfully",
        });
    });
});

// ✅ 4. Permanently Delete request (with file removal)
router.delete("/delete_my_leave_request/:id", (req, res) => {
    const { id } = req.params;

    // 1️⃣ Get the attachment path before deleting
    const getFileQuery = `SELECT attachment FROM leave_requests WHERE leave_requests_id=?`;
    db.query(getFileQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error while fetching file" });

        if (results.length && results[0].attachment) {
            const filePath = results[0].attachment;
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted file: ${filePath}`);
                } catch (error) {
                    console.error("❌ Error deleting file:", error);
                }
            }
        }

        // 2️⃣ Delete the record permanently
        const deleteQuery = `DELETE FROM leave_requests WHERE leave_requests_id=?`;
        db.query(deleteQuery, [id], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ error: "Database error while deleting record" });

            res.json({
                success: true,
                message: "Leave request and attachment deleted successfully",
            });
        });
    });
});

// ✅ Get Leave Balance
router.get("/my_leave_balance", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    const query = `
        SELECT 
        lt.leave_type_id, 
        lt.leave_type,
        lt.max_leave AS max_leaves,
        (
            lt.max_leave 
            - COALESCE(
                SUM(
                    DATEDIFF(lr.end_date, lr.start_date) + 1 
                    - (
                        SELECT COUNT(*) 
                        FROM holidays h
                        WHERE h.holiday_date BETWEEN lr.start_date AND lr.end_date
                    )
                ), 
            0)
        ) AS balance_leave
        FROM leave_type lt
        LEFT JOIN leave_requests lr 
            ON lt.leave_type_id = lr.leave_type_id 
            AND lr.emp_id = ?
            AND lr.leave_status != 'Canceled'
        GROUP BY lt.leave_type_id;`;

    db.query(query, [emp_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// ✅ Get Leave History
router.get("/my_leave_history", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    const query = `
        SELECT 
            lr.leave_requests_id AS leave_id,
            lr.start_date,
            lr.end_date,
            lt.leave_type,
            lr.leave_description AS reason
        FROM leave_requests lr
        LEFT JOIN leave_type lt ON lr.leave_type_id = lt.leave_type_id
        WHERE lr.emp_id = ?
        ORDER BY lr.start_date DESC
    `;

    db.query(query, [emp_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// ✅ Get approval info for employee
router.get("/leave_approver", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    if (!emp_id || emp_id === "null" || emp_id === "undefined") {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const query = `
        SELECT e.emp_id, e.emp_department, la.level_1, la.level_2, la.level_3
        FROM dadmin.employee e
        LEFT JOIN leave_approval la 
            ON la.department_id = e.emp_department 
        WHERE e.emp_id = ?;
    `;

    db.query(query, [emp_id], (err, results) => {
        if (err) {
            console.error("❌ Error fetching approval info:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (!results.length) {
            return res.json({ approver: "Admin" });
        }

        const { level_1, level_2, level_3 } = results[0];
        let approverId = null;

        if (level_1) approverId = level_1;
        else if (level_2) approverId = level_2;
        else if (level_3) approverId = level_3;

        if (!approverId) {
            return res.json({ approver: "Admin" });
        }

        // 🔹 Fetch approver's full name
        const approverQuery = `
            SELECT CONCAT(emp_first_name, ' ', emp_last_name) AS approver_name
            FROM dadmin.employee
            WHERE emp_id = ?;
        `;

        db.query(approverQuery, [approverId], (err2, approverResults) => {
            if (err2) {
                console.error("❌ Error fetching approver name:", err2);
                return res.status(500).json({ error: "Database error" });
            }

            if (!approverResults.length) {
                return res.json({ approver: "Admin" });
            }

            const approverName = approverResults[0].approver_name || "Admin";
            res.json({ approver: approverName });
        });
    });
});

// ✅ Get all leave requests
router.post("/leave_requests_list_filtered", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    if (!emp_id) {
        return res.status(400).json({ error: "emp_id required" });
    }

    // Step 1: Get employee department
    const deptQuery = `
        SELECT emp_department 
        FROM dadmin.employee 
        WHERE emp_id = ?
    `;

    db.query(deptQuery, [emp_id], (err, deptRes) => {
        if (err) return res.status(500).json({ error: "Database error 1" });
        if (deptRes.length === 0) return res.json([]);

        const department = deptRes[0].emp_department;

        // Step 2: Get approval levels for department
        const approvalQuery = `
            SELECT level_1, level_2, level_3 
            FROM leave_approval 
            WHERE department_id = ?
        `;

        db.query(approvalQuery, [department], (err, levelRes) => {
            if (err) return res.status(500).json({ error: "Database error 2" });
            if (levelRes.length === 0) return res.json([]);

            const levels = levelRes[0];

            // Step 3: Filter relevant leave requests
            const leaveQuery = `
                SELECT lr.*, 
                    CONCAT(e.emp_first_name, ' ', e.emp_last_name) AS emp_name,
                    e.emp_department,
                    lt.leave_type,
                    DATEDIFF(NOW(), lr.created_time) AS days_passed
                FROM leave_requests lr
                LEFT JOIN leave_type lt ON lr.leave_type_id = lt.leave_type_id
                LEFT JOIN dadmin.employee e ON lr.emp_id = e.emp_id
                WHERE lr.leave_status != 'Canceled'
                AND e.emp_department = ?
                ORDER BY lr.leave_requests_id DESC
            `;

            db.query(leaveQuery, [department], (err, reqRes) => {
                if (err) return res.status(500).json({ error: "Database error 3" });

                // Step 4: Filter based on level and days
                const finalList = reqRes.filter(req => {
                    const days = req.days_passed;

                    if (days <= 2 && emp_id == levels.level_1) return true;
                    if (days > 2 && days <= 4 && emp_id == levels.level_2) return true;
                    if (days > 4 && days <= 5 && emp_id == levels.level_3) return true;

                    return false;  // Hide for others or auto-approved
                });

                res.json(finalList);
            });
        });
    });
});

router.put("/update_status/:id", (req, res) => {
    const { id } = req.params;
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const updated_by = req.emp_id;

    const { status, reason } = req.body;

    const query = `
        UPDATE leave_requests
        SET leave_status = ?, 
            status_updated_time = NOW(),
            status_updated_reason = ?,
            status_updated_by = ?  
        WHERE leave_requests_id = ?;
    `;

    db.query(query, [status, reason || null, updated_by || null, id], (err, result) => {
        if (err) {
            console.error("❌ Error updating leave status:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Status updated successfully" });
    });
});

// Get Total Leaves (for dashboard table)
router.get("/my_total_leaves", verifyJWT, (req, res) => {
    if (!req.emp_id) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    const emp_id = req.emp_id;

    const query = `
        SELECT 
            lr.leave_requests_id,
            lt.leave_type,
            lr.start_date,
            lr.end_date,
            lr.leave_status,
            DATEDIFF(lr.end_date, lr.start_date) + 1 AS request_days
        FROM leave_requests lr
        LEFT JOIN leave_type lt ON lr.leave_type_id = lt.leave_type_id
        WHERE lr.emp_id = ?
        ORDER BY lr.start_date DESC
    `;

    db.query(query, [emp_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

module.exports = router;
