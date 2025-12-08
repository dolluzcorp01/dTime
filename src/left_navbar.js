import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { apiFetch } from "./utils/api";
import {
    FaCalendarTimes,
    FaSignOutAlt,
    FaUsers,
    FaTachometerAlt,
    FaAngleLeft,
    FaGripLines,
    FaBars,
    FaChevronLeft,
    FaAngleRight,
    FaChevronDown,
    FaChevronUp,
    FaChevronRight,
    FaCalendarAlt,
    FaChartBar,
    FaClipboardList
} from "react-icons/fa";
import logo_eagle from "./assets/img/logo_eagle.png";
import "./left_navbar.css";
import { de } from "date-fns/locale";

function LeftNavbar({ navSize, setNavSize }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isTimesheetOpen, setTimesheetOpen] = useState(true);
    const [isLeavemanagementOpen, setLeavemanagementOpen] = useState(true);
    const [loggedInEmp, setLoggedInEmp] = useState(null);
    const navigate = useNavigate();
    const [accessLevels, setAccessLevels] = useState([]);

    useEffect(() => {
        fetchloginedEmployees();
        fetchAccessLevels();
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

    const handleNavSizeChange = (size) => {
        setNavSize(size);
        setDropdownOpen(false);
    };

    const handleLogout = async () => {
        await apiFetch(`/api/login/logout`, {
            method: "POST",
            credentials: "include",
        });

        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
    };

    return (
        <>
            <div className={`left-navbar ${navSize}`} style={{ '--navbar-width': navSize === 'full' ? '220px' : navSize === 'icon-only' ? '40px' : '10px' }}>
                <div className={`navbar-header ${navSize === "full" ? "full-view-header" : ""}`}>
                    {navSize !== "hidden" && (<h3>
                        <a className="navbar-brand" href="#" style={{ marginRight: "10px", marginLeft: "30px" }}>
                            <img src={logo_eagle} alt="dTime Logo" className={`logo-img ${navSize}`} />
                        </a>
                        {navSize === "full" && "dTime"}
                    </h3>
                    )}
                </div>

                {navSize !== "hidden" && (
                    <ul className="navbar-menu">

                        {/* Dashboard */}
                        <li>
                            <NavLink to="/Dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                                <FaTachometerAlt className="nav-icon" />
                                {navSize === "full" && "Dashboard"}
                            </NavLink>
                        </li>

                        {/* Timesheet Group */}
                        <li className="dropdown-item">
                            <div className="dropdown-header" onClick={() => setTimesheetOpen(!isTimesheetOpen)}>
                                <FaUsers className="nav-icon" />
                                {navSize === "full" && "Timesheet"}
                                <span className="arrow-icon">{isTimesheetOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                            </div>

                            {isTimesheetOpen && (
                                <ul className="submenu">
                                    <li>
                                        <NavLink to="/timesheet-summary" className={({ isActive }) => isActive ? "active" : ""}>
                                            <FaChevronRight className="nav-icon" />   {/* ✅ Icon added */}
                                            {navSize === "full" && "Timesheet Summary"}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/Timesheet_entry" className={({ isActive }) => isActive ? "active" : ""}>
                                            <FaChevronRight className="nav-icon" />   {/* ✅ Icon added */}
                                            {navSize === "full" && "Timesheet Entry"}
                                        </NavLink>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* Leave Management Group */}
                        <li className="dropdown-item">
                            <div className="dropdown-header" onClick={() => setLeavemanagementOpen(!isLeavemanagementOpen)}>
                                <FaCalendarTimes className="nav-icon" />
                                {navSize === "full" && "Leave Management"}
                                <span className="arrow-icon">{isLeavemanagementOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                            </div>

                            {isLeavemanagementOpen && (
                                <ul className="submenu">
                                    <li>
                                        <NavLink to="/Leave_dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                                            <FaChartBar className="nav-icon" />
                                            {navSize === "full" && "Leave Dashboard"}
                                        </NavLink>
                                    </li>
                                    {hasPageAccess("Leave Approvals") && (
                                        <li>
                                            <NavLink to="/Leave_approvals" className={({ isActive }) => isActive ? "active" : ""}>
                                                <FaClipboardList className="nav-icon" />
                                                {navSize === "full" && "Leave Approvals"}
                                            </NavLink>
                                        </li>
                                    )}
                                    <li>
                                        <NavLink to="/My_leave_requests" className={({ isActive }) => isActive ? "active" : ""}>
                                            <FaChevronRight className="nav-icon" />
                                            {navSize === "full" && "My Leave Requests"}
                                        </NavLink>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* Holiday (Placeholder for now) */}
                        <li>
                            <NavLink to="/Holiday" className={({ isActive }) => isActive ? "active" : ""}>
                                <FaCalendarAlt className="nav-icon" />
                                {navSize === "full" && "Holiday"}
                            </NavLink>
                        </li>
                    </ul>
                )}

                <div className="logout-container">
                    <div className="logout-container">
                        {/* Dropdown Arrow Above */}
                        <div
                            className="view-dropdown-arrow"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            {navSize === "full" ? <FaAngleLeft /> : <FaAngleRight />}
                        </div>

                        {/* Logout Button Below */}
                        {navSize !== "hidden" && (
                            <NavLink
                                onClick={handleLogout}
                                className="logout-link"
                            >
                                <FaSignOutAlt
                                    className="nav-icon"
                                    style={navSize === "icon-only" ? { marginLeft: "10px" } : { marginRight: "5px" }}
                                />
                                {navSize === "full" && "Logout"}
                            </NavLink>
                        )}
                    </div>
                </div>
            </div>

            {dropdownOpen && (
                <div className="view-dropdown-menu">
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("full")}>
                        <FaGripLines /> Full View
                    </div>
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("icon-only")}>
                        <FaBars /> Icon Only
                    </div>
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("hidden")}>
                        <FaChevronLeft /> Hidden
                    </div>
                </div>
            )}
        </>
    );
}

export default LeftNavbar;
