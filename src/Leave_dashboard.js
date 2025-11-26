import React, { useEffect, useState } from "react";
import { apiFetch } from "./utils/api";
import { FaTimes } from "react-icons/fa";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";
import "./Leave_dashboard.css";
ChartJS.register(ArcElement, Tooltip, Legend);

const LeaveDashboard = ({ navSize }) => {
    const [totalLeaveRequests, setTotalLeaveRequests] = useState(0);
    const [approvedLeaves, setApprovedLeaves] = useState(0);
    const [rejectedLeaves, setRejectedLeaves] = useState(0);

    const [leaveBalance, setLeaveBalance] = useState([]);
    const [myLeaves, setMyLeaves] = useState([]);

    const [holidaysThisMonth, setHolidaysThisMonth] = useState([]);
    const [nextHoliday, setNextHoliday] = useState(null);

    const [fromTotal, setFromTotal] = useState("");
    const [toTotal, setToTotal] = useState("");

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [showAll, setShowAll] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState([]);

    const openModal = (type) => {
        let filtered = [];

        if (type === "Total Leave Requests") {
            filtered = myLeaves;
        }

        if (type === "Approved Leave Requests") {
            filtered = myLeaves.filter(l => l.leave_status === "Approved");
        }

        if (type === "Rejected Leave Requests") {
            filtered = myLeaves.filter(l => l.leave_status === "Rejected");
        }

        setModalTitle(type);
        setModalData(filtered);
        setShowModal(true);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };
    const normalizeDate = (d) => {
        if (!d) return "";
        return new Date(d).toISOString().split("T")[0];
    };

    const fetchCounts = async () => {
        const empId = localStorage.getItem("emp_id");
        const res = await apiFetch(`/api/leave/my_total_leaves/${empId}`);
        const data = await res.json();

        setTotalLeaveRequests(data.length);
        setApprovedLeaves(data.filter(l => l.leave_status === "Approved").length);
        setRejectedLeaves(data.filter(l => l.leave_status === "Rejected").length);
        setMyLeaves(data);
    };

    const fetchLeaveBalance = async () => {
        try {
            const empId = localStorage.getItem("emp_id");
            const res = await apiFetch(`/api/Leave/my_leave_balance/${empId}`);
            const data = await res.json();
            setLeaveBalance(data);
        } catch (err) {
            console.error("❌ Fetch balance error:", err);
        }
    };

    useEffect(() => {
        fetchCounts();
        fetchHolidays();
        fetchLeaveBalance();
    }, []);

    const fetchHolidays = async () => {
        const empId = localStorage.getItem("emp_id");
        const res = await apiFetch(`/api/holiday/list?month=${month}&year=${year}&emp_id=${empId}`);
        const result = await res.json();
        setHolidaysThisMonth(result);
        // Find the next upcoming holiday
        const today = new Date();
        const upcomingDate = result.find(h => new Date(h.holiday_date) >= today)?.holiday_date;

        const upcomingHolidays = upcomingDate
            ? result.filter(h => h.holiday_date === upcomingDate)
            : [];

        setNextHoliday(upcomingHolidays);
    };

    useEffect(() => {
        fetchCounts();
        fetchHolidays();
    }, []);

    return (
        <div className="leave-dashboard-container">
            <div className={`leave-dashboard ${navSize}`}>
                <div className="dashboard-grid">

                    <div className="card requests hover-grow" onClick={() => openModal("Total Leave Requests")}>
                        <h4>Total Leave Requests</h4>
                        <span className="count">{totalLeaveRequests}</span>
                    </div>

                    <div className="card approved hover-grow" onClick={() => openModal("Approved Leave Requests")}>
                        <h4>Approved Leave Requests</h4>
                        <span className="count">{approvedLeaves}</span>
                    </div>

                    <div className="card rejected hover-grow" onClick={() => openModal("Rejected Leave Requests")}>
                        <h4>Rejected Leave Requests</h4>
                        <span className="count">{rejectedLeaves}</span>
                    </div>

                    {showModal && (
                        <div className="modal-overlay">
                            <div className="modal-box">
                                <div className="modal-header">
                                    <h2>{modalTitle}</h2>
                                    <FaTimes
                                        className="close-btn"
                                        onClick={() => setShowModal(false)}
                                    />
                                </div>

                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>Leave ID</th>
                                            <th>Leave Type</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Days</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {modalData.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">No Records Found</td>
                                            </tr>
                                        ) : (
                                            modalData.map(l => (
                                                <tr key={l.leave_requests_id}>
                                                    <td>{l.leave_requests_id}</td>
                                                    <td>{l.leave_type}</td>
                                                    <td>{formatDate(l.start_date)}</td>
                                                    <td>{formatDate(l.end_date)}</td>
                                                    <td>{l.no_of_days}</td>
                                                    <td
                                                        style={{
                                                            fontWeight: "bold",
                                                            color:
                                                                l.leave_status === "Pending" ? "#007bff" :
                                                                    l.leave_status === "Approved" ? "#4caf50" :
                                                                        "#ff9800"
                                                        }}
                                                    >
                                                        {l.leave_status}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* holiday Dashboard */}
                    <div className="holiday-card">
                        {/* Next Holidays */}
                        <div className="next-holiday">
                            <button className="holiday-btn">
                                <h2>Next Holiday </h2>
                            </button>

                            <div className="holiday-box">
                                {nextHoliday && nextHoliday.length > 0 ? (
                                    <>
                                        {nextHoliday.slice(0, 2).map((h, index) => (
                                            <div key={index} className="next-holiday-name">
                                                {h.holiday_name}
                                            </div>
                                        ))}

                                        {nextHoliday.length > 2 && (
                                            <div className="more-box"
                                                onMouseEnter={() => setShowAll(true)}
                                                onMouseLeave={() => setShowAll(false)}
                                            >
                                                +{nextHoliday.length - 2} more
                                                {showAll && (
                                                    <div className="holiday-more-popup">
                                                        {nextHoliday.map((h, i) => (
                                                            <div key={i} className="popup-item">
                                                                <b>{h.holiday_name}</b>
                                                                <div>{formatDate(h.holiday_date)} to {formatDate(h.holiday_end)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="no-holiday">No Upcoming Holiday</div>
                                )}
                            </div>
                        </div>

                        {/* Holidays This Month Section */}
                        <div className="this-month-section">
                            <h2 style={{ marginTop: "15px" }}>Holidays This Month</h2>

                            {holidaysThisMonth.length === 0 ? (
                                <div className="empty-box">
                                    No more holidays scheduled for this month.
                                </div>
                            ) : (
                                holidaysThisMonth.map(h => (
                                    <div key={h.holiday_id} className="holiday-item">
                                        <div className="holiday-title">{h.holiday_name}</div>

                                        <div className="holiday-date">
                                            {formatDate(h.holiday_date)} to {formatDate(h.holiday_end)}
                                        </div>

                                        <div className="holiday-for">
                                            {h.holiday_for === "employee"
                                                ? "For: All Employees"
                                                : h.holiday_for === "department"
                                                    ? `For Department: ${h.department_name}`
                                                    : h.holiday_for === "job"
                                                        ? `For Job: ${h.job_name}`
                                                        : ""}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* On Leave Today */}
                    <div className="on-leave card">
                        <div className="card-header-row">
                            <h2>Available Leaves</h2>
                        </div>

                        <div className="pie-container">
                            {leaveBalance.length > 0 && (
                                <Pie
                                    data={{
                                        labels: leaveBalance.map(l => l.leave_type),
                                        datasets: [{
                                            data: leaveBalance.map(l => l.balance_leave),
                                            backgroundColor: ["#3f51b5", "#2196f3", "#f50057", "#ff9800"]
                                        }]
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Employee Leaves Table */}
                    <div className="employee-leaves card">
                        <div className="card-header-row">
                            <h2>Total Leaves</h2>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    type="date"
                                    value={fromTotal}
                                    onChange={(e) => setFromTotal(e.target.value)}
                                    className="date-filter"
                                />
                                <input
                                    type="date"
                                    value={toTotal}
                                    onChange={(e) => setToTotal(e.target.value)}
                                    className="date-filter"
                                />

                                {(fromTotal || toTotal) && (
                                    <span
                                        onClick={() => {
                                            setFromTotal("");
                                            setToTotal("");
                                        }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        ✖
                                    </span>
                                )}
                            </div>
                        </div>

                        <table>
                            <tbody>
                                {myLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="no-data">No data available</td>
                                    </tr>
                                ) : (
                                    myLeaves
                                        .filter(l => {
                                            const start = normalizeDate(l.start_date);
                                            const end = normalizeDate(l.end_date);

                                            if (fromTotal && !toTotal) return start >= fromTotal || end >= fromTotal;
                                            if (!fromTotal && toTotal) return start <= toTotal || end <= toTotal;

                                            if (fromTotal && toTotal) {
                                                return (
                                                    (start >= fromTotal && start <= toTotal) ||
                                                    (end >= fromTotal && end <= toTotal) ||
                                                    (fromTotal >= start && toTotal <= end)
                                                );
                                            }
                                            return true;
                                        })
                                        .map(l => (
                                            <tr key={l.leave_requests_id}>
                                                <td>{l.leave_type}</td>
                                                <td>{formatDate(l.start_date)}</td>
                                                <td>{formatDate(l.end_date)}</td>
                                                <td>{l.request_days}</td>
                                                <td>{l.leave_status}</td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div >
        </div>
    );
};

export default LeaveDashboard;
