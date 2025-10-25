import React, { useState } from "react";
import { NavLink } from "react-router-dom";
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
    FaCalendarAlt
} from "react-icons/fa";
import logo_eagle from "./assets/img/logo_eagle.png";
import "./left_navbar.css";

function LeftNavbar({ navSize, setNavSize }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isTimesheetOpen, setTimesheetOpen] = useState(true);

    const handleNavSizeChange = (size) => {
        setNavSize(size);
        setDropdownOpen(false);
    };

    return (
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

                    {/* Leave Management (Placeholder for now) */}
                    <li>
                        <NavLink to="/leave-management" className={({ isActive }) => isActive ? "active" : ""}>
                            <FaCalendarTimes className="nav-icon" />
                            {navSize === "full" && "Leave Management"}
                        </NavLink>
                    </li>

                    {/* Holiday (Placeholder for now) */}
                    <li>
                        <NavLink to="/Holiday" className={({ isActive }) => isActive ? "active" : ""}>
                            <FaCalendarAlt className="nav-icon" />
                            {navSize === "full" && "Holiday"}
                        </NavLink>
                    </li>

                    {/* Configuration (Placeholder for now) */}
                    <li>
                        <NavLink to="/Configuration" className={({ isActive }) => isActive ? "active" : ""}>
                            <i className="fa-solid fa-gears nav-icon"></i>
                            {navSize === "full" && "Configuration"}
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
                            to="/Login"
                            onClick={() => localStorage.clear()}
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
        </div>
    );
}

export default LeftNavbar;
