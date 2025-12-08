import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import { FaPaperclip, FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { apiFetch, API_BASE } from "./utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import logo_eagle from "./assets/img/logo_eagle.png";
import DOLLUZ_CORP from "./assets/img/DOLLUZ_CORP.png";
import "./Leave_approvals.css";

const Leave_approvals = ({ navSize }) => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState("leave_status");
    const [filters, setFilters] = useState({ leave_status: [] });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkReject, setIsBulkReject] = useState(false);
    const rowsPerPage = 10;
    const [loggedInEmp, setLoggedInEmp] = useState(null);
    const navigate = useNavigate();
    const [accessLevels, setAccessLevels] = useState([]);

    useEffect(() => {
        fetchAccessLevels();
        fetchloginedEmployees();
    }, [navigate]);

    const fetchloginedEmployees = async () => {
        try {
            const res = await apiFetch(`/api/employee/logined_employee`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();

            if (data?.message === "Access Denied. No Token Provided!" ||
                data?.message === "Invalid Token") {
                navigate("/login");
                return;
            }

            if (data[0].emp_id) {
                setLoggedInEmp(data[0]);
                fetchLeaveRequests();
                if (loggedInEmp && accessLevels.length > 0) {
                    if (!hasPageAccess("Leave Approvals")) {
                        navigate("/login");
                    }
                }
            }

        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    const hasPageAccess = (pageName) => {
        if (!loggedInEmp || accessLevels.length === 0) return false;

        const role = loggedInEmp.emp_access_level; // Admin, Sub Admin, Manager, User

        const page = accessLevels.find(p => p.page_name === pageName);
        if (!page) return false;

        if (role === "Admin") return page.admin_access === 1;
        if (role === "Sub Admin") return page.subadmin_access === 1;
        if (role === "Manager") return page.manager_access === 1;
        if (role === "User") return page.user_access === 1;

        return false;
    };

    const fetchAccessLevels = async () => {
        try {
            const res = await apiFetch(`/api/login/get-access`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setAccessLevels(data.data);
            }
        } catch (err) {
            console.error("❌ Error fetching access levels:", err);
        }
    };

    // ✅ Fetch leave requests
    const fetchLeaveRequests = async () => {
        try {
            const res = await apiFetch(`/api/leave/leave_requests_list_filtered`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
            });

            const data = await res.json();
            setLeaveRequests(data);
            setFilteredRequests(data);
        } catch (err) {
            console.error("❌ Error fetching leave requests:", err);
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Filter Options
    const filterOptions = [
        { value: "leave_status", label: "Status" },
        { value: "leave_type", label: "Leave Type" },
        { value: "emp_name", label: "Employee" },
    ];

    const getOptions = (key) => {
        const values = [...new Set(leaveRequests.map((req) => req[key] || "-"))];
        return values.map((v) => ({ value: v, label: v }));
    };

    // 🔹 Filtering Logic
    useEffect(() => {
        const filterableColumns = Object.keys(filters);
        const filtered = leaveRequests.filter((req) =>
            filterableColumns.every((col) => {
                if (!filters[col] || filters[col].length === 0) return true;
                return filters[col].some((f) => f.value === req[col]);
            })
        );
        setFilteredRequests(filtered);
        setCurrentPage(1);
    }, [filters, leaveRequests]);

    // 🔹 Pagination
    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // ✅ Approve Confirmation
    const handleApprove = async (id) => {
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "You are about to approve this leave request.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Approve",
            cancelButtonText: "Cancel",
        });

        if (confirm.isConfirmed) {
            handleStatusUpdate(id, "Approved");
        }
    };

    // ✅ Reject Modal Handling
    const handleReject = (id) => {
        setSelectedLeaveId(id);
        setRejectReason("");
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectReason.trim()) {
            Swal.fire("Please enter a reason before rejecting.", "", "warning");
            return;
        }

        if (isBulkReject) {
            // ✅ Bulk reject mode
            for (const id of selectedIds) {
                await handleStatusUpdate(id, "Rejected", rejectReason);
            }
            Swal.fire("Selected leaves rejected successfully.", "", "success");
            setSelectedIds([]);
        } else {
            // ✅ Single reject mode
            handleStatusUpdate(selectedLeaveId, "Rejected", rejectReason);
        }

        setShowRejectModal(false);
        setIsBulkReject(false);
    };

    // ✅ Common Update Function
    const handleStatusUpdate = async (id, status, reason = null) => {
        try {
            const res = await apiFetch(`/api/leave/update_status/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, reason }),
            });

            if (res.ok) {
                Swal.fire(`Leave ${status.toLowerCase()} successfully.`, "", "success");
                fetchLeaveRequests();
            } else {
                Swal.fire("Failed to update status.", "", "error");
            }
        } catch (err) {
            console.error("Error updating leave status:", err);
        }
    };

    const handleBulkAction = async (status) => {
        if (selectedIds.length === 0) return;

        if (status === "Rejected") {
            setIsBulkReject(true);
            setShowRejectModal(true);
            return; // ❌ Don't proceed here — handled by modal
        }

        const confirm = await Swal.fire({
            title: `Are you sure to ${status.toLowerCase()} selected leaves?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: `Yes, ${status}`,
            cancelButtonText: "Cancel",
        });

        if (confirm.isConfirmed) {
            for (const id of selectedIds) {
                await handleStatusUpdate(id, status);
            }
            Swal.fire(`Selected leaves ${status.toLowerCase()} successfully.`, "", "success");
            setSelectedIds([]);
        }
    };

    // ✅ Export to PDF Function (SweetAlert + Only Selected Rows)
    const exportToPDF = (leaveRequests) => {
        let exportData =
            selectedIds.length > 0
                ? leaveRequests.filter((r) => selectedIds.includes(r.leave_requests_id))
                : [];

        if (exportData.length === 0) {
            Swal.fire("No rows selected!", "Please select at least one leave request to export.", "warning");
            return;
        }

        const doc = new jsPDF("landscape");
        const pageWidth = doc.internal.pageSize.getWidth();

        autoTable(doc, {
            head: [[
                "Request ID",
                "Employee",
                "Leave Type",
                "Start Date (Breakdown)",
                "End Date (Breakdown)",
                "Requested Days",
                "Description",
                "Attachment",
                "Status"
            ]],
            body: exportData.map((leave) => {
                const start = new Date(leave.start_date);
                const end = new Date(leave.end_date);
                let diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
                if (leave.start_date_breakdown !== "Full") diffDays -= 0.5;
                if (leave.end_date_breakdown !== "Full") diffDays -= 0.5;

                return [
                    leave.leave_requests_id,
                    leave.emp_name || leave.emp_id,
                    leave.leave_type || "-",
                    `${new Date(leave.start_date).toLocaleDateString()} (${leave.start_date_breakdown})`,
                    `${new Date(leave.end_date).toLocaleDateString()} (${leave.end_date_breakdown})`,
                    diffDays.toFixed(1),
                    leave.leave_description || "-",
                    leave.attachment ? "Yes" : "No",
                    leave.leave_status || "Pending"
                ];
            }),
            startY: 55,
            margin: { top: 50 },
            theme: "grid",
            styles: { fontSize: 7, cellWidth: "wrap", overflow: "linebreak" },
            headStyles: { halign: "center", fillColor: [41, 128, 185] },
            columnStyles: { 6: { cellWidth: 40 } },
            didDrawPage: function () {
                const imgWidth = 60;
                const imgHeight = 20;
                const imgX = (pageWidth - imgWidth) / 2;
                const imgY = 5;

                doc.addImage(DOLLUZ_CORP, "PNG", imgX, imgY, imgWidth, imgHeight);
                doc.setFontSize(13);
                doc.text("Leave Requests Report", pageWidth / 2, imgY + imgHeight + 8, { align: "center" });
                doc.setFontSize(9);
                doc.text("Generated by dAdmin", pageWidth / 2, imgY + imgHeight + 16, { align: "center" });
            },
        });

        doc.save("Leave_Requests_Report.pdf");
        Swal.fire("Exported!", "Selected leave requests exported as PDF.", "success");
    };

    // ✅ Export to Excel Function (SweetAlert + Only Selected Rows)
    const exportToExcel = async (leaveRequests) => {
        let exportData =
            selectedIds.length > 0
                ? leaveRequests.filter((r) => selectedIds.includes(r.leave_requests_id))
                : [];

        if (exportData.length === 0) {
            Swal.fire("No rows selected!", "Please select at least one leave request to export.", "warning");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Leave Requests");

        // ✅ Add Logo
        const imageResponse = await fetch(DOLLUZ_CORP);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: "png",
        });

        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 180, height: 80 } });

        worksheet.addRow([]);
        worksheet.addRow([]);
        worksheet.addRow([]);

        worksheet.mergeCells("A4:H4");
        worksheet.getCell("A4").value = "Leave Requests Report";
        worksheet.getCell("A4").font = { size: 14, bold: true };
        worksheet.getCell("A4").alignment = { horizontal: "center" };

        worksheet.mergeCells("A5:H5");
        worksheet.getCell("A5").value = "Generated by dAdmin";
        worksheet.getCell("A5").font = { size: 10, italic: true };
        worksheet.getCell("A5").alignment = { horizontal: "center" };

        worksheet.addRow([]);

        const headers = [
            "Request ID",
            "Employee",
            "Leave Type",
            "Start Date (Breakdown)",
            "End Date (Breakdown)",
            "Requested Days",
            "Description",
            "Attachment",
            "Status",
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8DB4E2" } };
            cell.font = { bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        exportData.forEach((leave) => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            let diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
            if (leave.start_date_breakdown !== "Full") diffDays -= 0.5;
            if (leave.end_date_breakdown !== "Full") diffDays -= 0.5;

            const row = [
                leave.leave_requests_id,
                leave.emp_name || leave.emp_id,
                leave.leave_type || "-",
                `${new Date(leave.start_date).toLocaleDateString()} (${leave.start_date_breakdown})`,
                `${new Date(leave.end_date).toLocaleDateString()} (${leave.end_date_breakdown})`,
                diffDays.toFixed(1),
                leave.leave_description || "-",
                leave.attachment ? leave.attachment.split("/").pop() : "No File",
                leave.leave_status || "Pending",
            ];

            const dataRow = worksheet.addRow(row);
            dataRow.eachCell((cell) => {
                cell.alignment = { vertical: "top", wrapText: true };
                cell.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };
            });
        });

        worksheet.columns.forEach((col) => {
            let maxLength = 10;
            col.eachCell({ includeEmpty: true }, (cell) => {
                const len = cell.value ? cell.value.toString().length : 10;
                maxLength = Math.max(maxLength, len + 2);
            });
            col.width = Math.min(maxLength, 40);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Leave_Requests_Report.xlsx`;
        link.click();

        Swal.fire("Exported!", "Selected leave requests exported as Excel.", "success");
    };

    return (
        <div className="leave-requests-container">
            <div className={`leave-requests-dashboard ${navSize}`}>
                <div className="header-wrapper">
                    <h2>
                        Leave Requests
                    </h2>
                </div>

                <div className="leave-requests-content">
                    <div className="leave-filters-container">
                        <div className="filters-left">
                            <Select
                                options={filterOptions}
                                value={filterOptions.find((f) => f.value === selectedFilter)}
                                onChange={(val) => {
                                    setSelectedFilter(val.value);
                                    setFilters((prev) => ({ ...prev, [val.value]: [] }));
                                    setCurrentPage(1);
                                }}
                                placeholder="Select Filter"
                                isSearchable
                                styles={{ container: (provided) => ({ ...provided, width: 220 }) }}
                            />
                            <Select
                                placeholder={`Filter by ${filterOptions.find((f) => f.value === selectedFilter).label}`}
                                options={getOptions(selectedFilter)}
                                value={filters[selectedFilter]}
                                onChange={(vals) =>
                                    setFilters((prev) => ({ ...prev, [selectedFilter]: vals || [] }))
                                }
                                closeMenuOnSelect={false}
                                isMulti
                                isClearable
                                styles={{
                                    container: (provided) => ({ ...provided, width: 250 }),
                                    multiValue: (provided) => ({ ...provided, backgroundColor: "#e0e0e0" }),
                                }}
                            />

                            <div className="bulk-actions">
                                <button
                                    className="approve-btn"
                                    onClick={() => handleBulkAction("Approved")}
                                    disabled={selectedIds.length === 0}
                                >
                                    Bulk Approve
                                </button>

                                <button
                                    className="reject-btn"
                                    onClick={() => {
                                        setIsBulkReject(true);
                                        setShowRejectModal(true);
                                        setRejectReason("");
                                    }}
                                    disabled={selectedIds.length === 0}
                                >
                                    Bulk Reject
                                </button>

                                {/* Export icons */}
                                <FaDownload
                                    size={20}
                                    style={{ color: "#333" }}
                                    title="Download"
                                />
                                <FaFilePdf
                                    size={24}
                                    color="#e74c3c"
                                    title="Export as PDF"
                                    onClick={() => exportToPDF(filteredRequests)}
                                />
                                <FaFileExcel
                                    size={24}
                                    color="#27ae60"
                                    title="Export as Excel"
                                    onClick={() => exportToExcel(filteredRequests)}
                                />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <p className="loading-text">Loading leave requests...</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="leave-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds(paginatedRequests.map((r) => r.leave_requests_id));
                                                    } else {
                                                        setSelectedIds([]);
                                                    }
                                                }}
                                                checked={
                                                    paginatedRequests.length > 0 &&
                                                    selectedIds.length === paginatedRequests.length
                                                }
                                            />
                                        </th>
                                        <th>ID</th>
                                        <th>Employee</th>
                                        <th>Leave Type</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Requested Days</th>
                                        <th>Description</th>
                                        <th>Attachment</th>
                                        <th>Status</th>
                                        <th>Approval</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRequests.length > 0 ? (
                                        paginatedRequests.map((leave) => {
                                            const start = new Date(leave.start_date);
                                            const end = new Date(leave.end_date);
                                            let diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
                                            if (leave.start_date_breakdown !== "Full") diffDays -= 0.5;
                                            if (leave.end_date_breakdown !== "Full") diffDays -= 0.5;

                                            return (
                                                <tr key={leave.leave_requests_id}>
                                                    {/* ✅ Selection Checkbox */}
                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(leave.leave_requests_id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedIds((prev) => [...prev, leave.leave_requests_id]);
                                                                } else {
                                                                    setSelectedIds((prev) =>
                                                                        prev.filter((id) => id !== leave.leave_requests_id)
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                    </td>

                                                    <td>{leave.leave_requests_id}</td>
                                                    <td>{leave.emp_name || leave.emp_id}</td>
                                                    <td>{leave.leave_type || "-"}</td>
                                                    <td>
                                                        {new Date(leave.start_date).toLocaleDateString()} (
                                                        {leave.start_date_breakdown})
                                                    </td>
                                                    <td>
                                                        {new Date(leave.end_date).toLocaleDateString()} (
                                                        {leave.end_date_breakdown})
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>{diffDays.toFixed(1)}</td>

                                                    <td
                                                        style={{
                                                            maxWidth: "200px",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={leave.leave_description}
                                                    >
                                                        {leave.leave_description || "-"}
                                                    </td>

                                                    <td style={{ textAlign: "center" }}>
                                                        {leave.attachment ? (
                                                            <a
                                                                href={`${API_BASE}/leave_attachments/${leave.attachment
                                                                    .replace(/\\/g, "/")
                                                                    .split("/")
                                                                    .pop()}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: "#4a90e2", fontSize: "18px" }}
                                                            >
                                                                <FaPaperclip />
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: "#999" }}>No File</span>
                                                        )}
                                                    </td>

                                                    <td
                                                        className={`status-cell status-${leave.leave_status?.toLowerCase()}`}
                                                    >
                                                        {leave.leave_status || "Pending"}
                                                    </td>

                                                    <td style={{ textAlign: "center" }}>
                                                        {leave.leave_status?.toLowerCase() === "pending" ? (
                                                            <>
                                                                <button
                                                                    className="approve-btn"
                                                                    onClick={() => handleApprove(leave.leave_requests_id)}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="reject-btn"
                                                                    onClick={() => handleReject(leave.leave_requests_id)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="11" style={{ textAlign: "center" }}>
                                                No leave requests found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Reason for Rejection</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter reason here..."
                            rows="4"
                        />
                        <div className="modal-buttons">
                            <button className="reject-btn" onClick={confirmReject}>
                                Reject
                            </button>
                            <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leave_approvals;
