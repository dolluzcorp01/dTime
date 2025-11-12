import React, { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import LeftNavbar from "./left_navbar";
import { FaPaperclip } from "react-icons/fa";
import Header from "./Header";
import { apiFetch, API_BASE } from "./utils/api";
import "./My_leave_requests.css";

function MyLeaveRequests() {
    const [navSize, setNavSize] = useState("full");
    const [empId, setEmpId] = useState(null);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [requests, setRequests] = useState([]);
    const [formData, setFormData] = useState({
        emp_id: empId,
        leave_type_id: "",
        start_date: "",
        start_date_breakdown: "Full",
        end_date: "",
        end_date_breakdown: "Full",
        attachment: "",
        leave_description: "",
    });
    const [file, setFile] = useState(null);
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [approver, setApprover] = useState("");

    useEffect(() => {
        const id = localStorage.getItem("emp_id");
        setEmpId(id);
    }, []);

    const fetchApprover = async () => {
        try {
            const empId = localStorage.getItem("emp_id");
            const res = await apiFetch(`/api/Leave/leave_approver/${empId}`);
            const data = await res.json();
            setApprover(data.approver);
        } catch (err) {
            console.error("❌ Fetch approver error:", err);
        }
    };

    const fetchLeaveBalance = async () => {
        try {
            const res = await apiFetch(`/api/Leave/my_leave_balance/${formData.emp_id}`);
            const data = await res.json();
            setLeaveBalance(data);
        } catch (err) {
            console.error("❌ Fetch balance error:", err);
        }
    };

    const fetchLeaveHistory = async () => {
        try {
            const res = await apiFetch(`/api/Leave/my_leave_history/${formData.emp_id}`);
            const data = await res.json();
            setLeaveHistory(data);
        } catch (err) {
            console.error("❌ Fetch history error:", err);
        }
    };

    // Fetch all leave types + existing leave requests
    useEffect(() => {
        fetchApprover();
        fetchLeaveTypes();
        fetchRequests();
        fetchLeaveBalance();
        fetchLeaveHistory();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const res = await apiFetch("/api/Leave/leave_type_list");
            const data = await res.json();
            setLeaveTypes(data);
        } catch (err) {
            console.error("❌ Fetch leave types error:", err);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await apiFetch("/api/Leave/my_leave_request_list");
            const data = await res.json();
            setRequests(data);
            console.log("Fetched requests:", data);
        } catch (err) {
            console.error("❌ Fetch requests error:", err);
        }
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const [removeOldAttachment, setRemoveOldAttachment] = useState(false);

    const handleRemoveOldAttachment = () => {
        setFormData({ ...formData, old_attachment: "" });
        setRemoveOldAttachment(true);
    };

    const handleCancelEdit = () => {
        setFormData({
            emp_id: empId,
            leave_type_id: "",
            start_date: "",
            start_date_breakdown: "Full",
            end_date: "",
            end_date_breakdown: "Full",
            leave_description: "",
            old_attachment: "",
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // ✅ clears file input UI
        setEditId(null);
        setRemoveOldAttachment(false);
    };

    const handleSave = async () => {
        const { emp_id, leave_type_id, start_date, end_date } = formData;

        if (!leave_type_id || !start_date || !end_date) {
            Swal.fire("Validation Error", "Leave type, start date, and end date are required", "error");
            return;
        }

        // ✅ 1. Calculate total leave days being applied
        const start = new Date(start_date);
        const end = new Date(end_date);
        const appliedDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

        // ✅ 2. Fetch user's leave balance
        try {
            const res = await apiFetch(`/api/Leave/my_leave_balance/${emp_id}`);
            const balances = await res.json();

            // ✅ 3. Find selected leave type's balance
            const selectedLeave = balances.find(b => b.leave_type_id === parseInt(leave_type_id));

            if (!selectedLeave) {
                Swal.fire("Error", "Unable to fetch your leave balance", "error");
                return;
            }

            const remaining = selectedLeave.balance_leave;

            // ✅ 4. Compare balance
            if (appliedDays > remaining) {
                Swal.fire(
                    "Insufficient Balance",
                    `You have only ${remaining} day(s) of ${selectedLeave.leave_type} left.`,
                    "warning"
                );
                return;
            }

            // ✅ 5. Continue to submit if balance is okay
            const formDataObj = new FormData();
            Object.entries(formData).forEach(([key, value]) => formDataObj.append(key, value));
            if (file) formDataObj.append("attachment", file);
            if (removeOldAttachment) formDataObj.append("removeOldAttachment", "true");

            const url = editId
                ? `/api/Leave/update_my_leave_request/${editId}`
                : "/api/Leave/add_my_leave_request";
            const method = editId ? "PUT" : "POST";

            const saveRes = await apiFetch(url, { method, body: formDataObj });
            const data = await saveRes.json();

            if (data.success) {
                Swal.fire("Success", data.message, "success");
                handleCancelEdit();
                fetchRequests();
            } else {
                Swal.fire("Error", data.message || "Something went wrong", "error");
            }

        } catch (err) {
            console.error("Error checking leave balance:", err);
            Swal.fire("Error", "Failed to check leave balance", "error");
        }
    };

    const handleEdit = (item) => {
        setFormData({
            emp_id: item.emp_id,
            leave_type_id: item.leave_type_id,
            start_date: formatDate(item.start_date),
            start_date_breakdown: item.start_date_breakdown,
            end_date: formatDate(item.end_date),
            end_date_breakdown: item.end_date_breakdown,
            leave_description: item.leave_description,
            old_attachment: item.attachment || "", // ✅ store old file path
        });

        setFile(null); // clear file input
        if (fileInputRef.current) fileInputRef.current.value = ""; // ✅ clears file input UI
        setEditId(item.leave_requests_id);
    };

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "This will delete your leave request!",
            icon: "warning",
            showCancelButton: true,
        });

        if (confirm.isConfirmed) {
            try {
                const res = await apiFetch(`/api/Leave/delete_my_leave_request/${id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ canceled_by: empId }),
                });
                const data = await res.json();
                if (data.success) {
                    Swal.fire("Deleted!", data.message, "success");
                    fetchRequests();
                }
            } catch {
                Swal.fire("Error", "Something went wrong", "error");
            }
        }
    };

    const handleCancel = async (id) => {
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to cancel this leave request?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, cancel it!",
        });

        if (confirm.isConfirmed) {
            try {
                const res = await apiFetch(`/api/Leave/cancel_my_leave_request/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ canceled_by: empId }),
                });
                const data = await res.json();

                if (data.success) {
                    Swal.fire("Canceled!", data.message, "success");
                    fetchRequests(); // refresh table
                } else {
                    Swal.fire("Error", data.error || "Something went wrong", "error");
                }
            } catch (err) {
                Swal.fire("Error", "Something went wrong", "error");
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0]; // returns "YYYY-MM-DD"
    };

    return (
        <div className="leave-config-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <Header />

            <div className={`leave-config-wrapper ${navSize}`}>
                <div className="leave-header-row">
                    <h2>My Leave Requests</h2>
                    <div className="approval-info">
                        <strong>Approver: </strong> {approver || "Admin"}
                    </div>
                </div>

                <div className="leave-form">
                    <div className="form-group">
                        <label>Leave Type <span style={{ color: "red" }}>*</span></label>
                        <select
                            className="form-control"
                            value={formData.leave_type_id}
                            onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                        >
                            <option value="">Select Leave Type</option>
                            {leaveTypes.map((lt) => (
                                <option key={lt.leave_type_id} value={lt.leave_type_id}>
                                    {lt.leave_type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Start Date <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="date"
                            className="form-control"
                            value={formData.start_date}
                            min={new Date().toISOString().split("T")[0]} // disable past dates
                            onChange={(e) => {
                                const selectedDate = e.target.value;
                                setFormData({
                                    ...formData,
                                    start_date: selectedDate,
                                    end_date: "", // reset end date if start date changes
                                });
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Start Date Breakdown</label>
                        <select
                            className="form-control"
                            value={formData.start_date_breakdown}
                            onChange={(e) => setFormData({ ...formData, start_date_breakdown: e.target.value })}
                        >
                            <option>Full</option>
                            <option>First half</option>
                            <option>Second half</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>End Date <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="date"
                            className="form-control"
                            value={formData.end_date}
                            min={formData.start_date || new Date().toISOString().split("T")[0]} // disable before start date
                            disabled={!formData.start_date} // disable until start date selected
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>End Date Breakdown</label>
                        <select
                            className="form-control"
                            value={formData.end_date_breakdown}
                            onChange={(e) => setFormData({ ...formData, end_date_breakdown: e.target.value })}
                        >
                            <option>Full</option>
                            <option>First half</option>
                            <option>Second half</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Attachment</label>

                        {/* ✅ Show existing file with delete icon */}
                        {formData.old_attachment && !file && (
                            <div
                                style={{
                                    marginBottom: "5px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "#f7f7f7",
                                    borderRadius: "6px",
                                    padding: "5px 10px",
                                }}
                            >
                                <a
                                    href={`${API_BASE}/${formData.old_attachment.replace(/\\/g, "/")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#4a90e2", fontSize: "0.9rem" }}
                                >
                                    {formData.old_attachment.split("\\").pop()}
                                </a>
                                <i class="fa-solid fa-xmark"
                                    onClick={handleRemoveOldAttachment}
                                    title="Remove attachment"
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "gray",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                    }}
                                ></i>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="form-control"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Description</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Description"
                            value={formData.leave_description}
                            onChange={(e) => setFormData({ ...formData, leave_description: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ visibility: "hidden" }}>Submit</label>
                        {editId ? (
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn btn-success w-100" onClick={handleSave}>
                                    Update
                                </button>
                                <button className="btn btn-secondary w-100" onClick={handleCancelEdit}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button className="btn btn-success w-100" onClick={handleSave}>
                                Submit
                            </button>
                        )}
                    </div>
                </div>

                <table className="leave-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Attachment</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((item) => (
                            <tr key={item.leave_requests_id}>
                                <td>{item.leave_requests_id}</td>
                                <td>{item.leave_type}</td>
                                <td>{formatDate(item.start_date)}</td>
                                <td>{formatDate(item.end_date)}</td>
                                <td style={{ textAlign: "center" }}>
                                    {item.attachment ? (
                                        <a
                                            href={`${API_BASE}/${item.attachment.replace(/\\/g, "/")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "#4a90e2", fontSize: "18px" }}
                                            title={item.attachment.split("\\").pop()}
                                        >
                                            <FaPaperclip />
                                        </a>
                                    ) : (
                                        <span style={{ color: "#999" }}>No File</span>
                                    )}
                                </td>
                                <td>
                                    <span
                                        style={{
                                            color:
                                                item.leave_status === "Canceled"
                                                    ? "red"
                                                    : item.leave_status === "Approved"
                                                        ? "green"
                                                        : "orange",
                                            fontWeight: "500",
                                        }}
                                    >
                                        {item.leave_status || "Pending"}
                                    </span>
                                </td>
                                <td>
                                    {item.leave_status === "Canceled" ? (
                                        <>
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={() => handleEdit(item)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm ms-2"
                                                onClick={() => handleDelete(item.leave_requests_id)}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn btn-gray btn-sm"
                                                onClick={() => handleCancel(item.leave_requests_id)}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="leave-summary-container">
                    <div className="leave-balance">
                        <h4>Leave Balance</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Max Leaves</th>
                                    <th>Balance Leave</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveBalance.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.leave_type}</td>
                                        <td>{item.max_leaves}</td>
                                        <td>{item.balance_leave}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="leave-history">
                        <h4>Leave History</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Leave ID</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Leave Type</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveHistory.map((item) => (
                                    <tr key={item.leave_id}>
                                        <td>{item.leave_id}</td>
                                        <td>{formatDate(item.start_date)}</td>
                                        <td>{formatDate(item.end_date)}</td>
                                        <td>{item.leave_type}</td>
                                        <td>{item.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default MyLeaveRequests;
