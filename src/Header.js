import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaUserCircle, FaClock, FaCamera, FaSignOutAlt } from "react-icons/fa";
import { apiFetch, EMP_PROFILE_FILE_BASE } from "./utils/api";
import logo_eagle from "./assets/img/logo_eagle.png";
import "./Header.css";

function Header() {
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [history, setHistory] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [loggedInEmp, setLoggedInEmp] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [showEmpMenu, setShowEmpMenu] = useState(false);
    const [isDropdownHovered, setIsDropdownHovered] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = "#";
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            color += ("00" + value.toString(16)).slice(-2);
        }
        return color;
    }

    useEffect(() => {
        fetchloginedEmployees();
    }, []);

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
                fetchPunchHistory();
            }

        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    useEffect(() => {
        let interval = null;
        if (isPunchedIn) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isPunchedIn]);

    const formatTime = (sec) => {
        const h = String(Math.floor(sec / 3600)).padStart(2, "0");
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    const fetchPunchHistory = async () => {
        try {
            const res = await apiFetch(`/api/punch/history`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();

            // Group data by date (e.g., "Monday (16-10-2025)")
            const grouped = {};

            data.forEach(entry => {
                const dateObj = new Date(entry.punch_in);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dateFormatted = dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy
                const key = `${dayName} (${dateFormatted})`;

                if (!grouped[key]) grouped[key] = [];

                grouped[key].push({
                    start: new Date(entry.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    end: entry.punch_out
                        ? new Date(entry.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "—",
                    duration: entry.punch_out
                        ? formatTime(Math.floor((new Date(entry.punch_out) - new Date(entry.punch_in)) / 1000))
                        : "—"
                });
            });

            setHistory(grouped);
        } catch (err) {
            console.error("Error fetching punch history:", err);
        }
    };

    const handlePunch = async () => {
        if (!isPunchedIn) {
            // Punch In
            const res = await apiFetch("/api/punch/punch-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setIsPunchedIn(true);
                setStartTime(new Date().toLocaleTimeString());
            }
        } else {
            // Punch Out
            const res = await apiFetch("/api/punch/punch-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setIsPunchedIn(false);
                const recordedTime = formatTime(seconds);

                // Get today key
                const today = new Date();
                const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
                const dateFormatted = today.toLocaleDateString('en-GB'); // dd/mm/yyyy
                const key = `${dayName} (${dateFormatted})`;

                setHistory(prev => ({
                    ...prev,
                    [key]: [
                        ...(prev[key] || []),
                        { start: startTime, end: today.toLocaleTimeString(), duration: recordedTime }
                    ]
                }));

                setSeconds(0);
            }
        }
    };

    const MAX_FILE_SIZE = 0.5 * 1024 * 1024; // 0.5 MB in bytes

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ✅ Check file size
        if (file.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: "Please select an image smaller than 0.5 MB.",
            });
            // Reset selected file and input
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setSelectedFile(file);
    };

    const handleSaveProfileImage = async () => {
        if (!selectedFile) {
            Swal.fire({
                icon: "warning",
                title: "No File Selected",
                text: "Please select a profile image before saving.",
            });
            return;
        }

        // ✅ Optional: double-check file size before sending
        if (selectedFile.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: "Please select an image smaller than 0.5 MB.",
            });
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append("profile", selectedFile);

        try {
            const res = await apiFetch(`/api/employee/upload-profile`, {
                method: "POST",
                body: formDataToSend,
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to upload profile image");

            Swal.fire({
                icon: "success",
                title: "Profile Updated",
                text: "Your profile image has been updated successfully!",
            });

            // Close modal after success
            setIsModalOpen(false);

            // Update logged in user state
            setLoggedInEmp(prev => ({ ...prev, emp_profile_img: data.profilePath }));

            // Reset file input
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = null;

        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Upload Error",
                text: err.message,
            });
        }
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
        <header className="app-header">
            <div className="header-left">
                <a className="navbar-brand" href="#" style={{ marginRight: "10px", marginLeft: "10px" }}>
                    <img src={logo_eagle} alt="dTime Logo" />
                </a>
                <h2 style={{ color: "white" }}>dTime</h2>
            </div>

            <div className="header-center">

                <button
                    onClick={handlePunch}
                    className={`punch-btn ${isPunchedIn ? "punch-out" : "punch-in"}`}
                >
                    {isPunchedIn ? "Punch Out" : "Punch In"}
                </button>

                {isPunchedIn || seconds > 0 ? (
                    <span className="timer">{formatTime(seconds)}</span>
                ) : (
                    <span className="timer">00:00:00</span>
                )}

                {Object.keys(history).length > 0 && (
                    <FaClock className="clock-icon"
                        onClick={() => setShowModal(true)}
                        style={{ cursor: "pointer", fontSize: "20px" }} />
                )}

            </div>

            <div className="header-right">
                {loggedInEmp ? (
                    <>
                        <span className="user-name">
                            Welcome, {loggedInEmp.emp_first_name} {loggedInEmp.emp_last_name}
                        </span>
                        <div
                            className="emp-circle"
                            onClick={() => setShowEmpMenu(!showEmpMenu)}
                            onMouseEnter={() => setIsDropdownHovered(true)}
                            onMouseLeave={() => setIsDropdownHovered(false)}
                            style={{
                                backgroundColor: loggedInEmp.emp_profile_img
                                    ? "transparent"
                                    : loggedInEmp.profile_color ?? stringToColor(loggedInEmp.emp_first_name + " " + loggedInEmp.emp_last_name),
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "14px",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                overflow: "hidden",
                            }}
                        >
                            {loggedInEmp.emp_profile_img ? (
                                <img
                                    src={
                                        loggedInEmp.emp_profile_img.startsWith("data:")
                                            ? loggedInEmp.emp_profile_img
                                            : `${EMP_PROFILE_FILE_BASE}/${loggedInEmp.emp_profile_img.replace(/\\/g, "/")}`
                                    }
                                    alt="Profile"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                // If hovering → show camera icon. Else → show initials.
                                isDropdownHovered ? (
                                    <FaCamera color="white" />
                                ) : (
                                    loggedInEmp.profile_letters ??
                                    (loggedInEmp.emp_first_name.charAt(0).toUpperCase() +
                                        loggedInEmp.emp_last_name.charAt(0).toUpperCase())
                                )
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <span className="user-name">Welcome, Employee</span>
                        <FaUserCircle className="user-icon" />
                    </>
                )}

                {showEmpMenu && (
                    <div className="emp-dropdown">
                        {/* Profile Info */}
                        <div className="emp-profile">
                            <div
                                className="emp-profile-circle"
                                style={{
                                    backgroundColor: loggedInEmp.emp_profile_img
                                        ? "transparent"
                                        : loggedInEmp.profile_color ?? stringToColor(loggedInEmp.emp_first_name + " " + loggedInEmp.emp_last_name),
                                    color: "#fff",
                                    fontWeight: "bold",
                                    fontSize: "18px",
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                }}
                                onMouseEnter={() => setIsDropdownHovered(true)}
                                onMouseLeave={() => setIsDropdownHovered(false)}
                                onClick={() => setIsModalOpen(true)}
                            >
                                {loggedInEmp.emp_profile_img ? (
                                    <img
                                        src={
                                            loggedInEmp.emp_profile_img.startsWith("data:")
                                                ? loggedInEmp.emp_profile_img
                                                : `${EMP_PROFILE_FILE_BASE}/${loggedInEmp.emp_profile_img.replace(/\\/g, "/")}`
                                        }
                                        alt="Profile"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : (
                                    isDropdownHovered ? (
                                        <FaCamera color="white" />
                                    ) : (
                                        loggedInEmp.profile_letters ??
                                        (loggedInEmp.emp_first_name.charAt(0).toUpperCase() +
                                            loggedInEmp.emp_last_name.charAt(0).toUpperCase())
                                    )
                                )}
                            </div>

                            <div className="emp-profile-text">
                                <div className="emp-name">{loggedInEmp.emp_first_name + " " + loggedInEmp.emp_last_name}</div>
                                <div className="emp-org" style={{ fontStyle: "italic", whiteSpace: "nowrap" }}>
                                    One Place. One start. One Team.
                                </div>
                            </div>
                        </div>

                        {/* Dropdown actions */}
                        <button
                            onClick={() => navigate('/login?changePassword')}
                            className="emp-dropdown-btn"
                            style={{ color: "#333333" }}
                        >
                            <i className="fa fa-key"></i> Change Password
                        </button>
                        <button
                            onClick={handleLogout}
                            className="emp-dropdown-btn logout-btn"
                        >
                            <FaSignOutAlt
                                className="logout-icon"
                                style={{ marginRight: "6px" }}
                            />Logout
                        </button>
                    </div>
                )}

                {isModalOpen && (
                    <div className="profile-modal-overlay">
                        <div className="profile-modal" ref={modalRef}>
                            <button
                                className="profile-modal-close"
                                onClick={() => setIsModalOpen(false)}
                            >
                                ✖
                            </button>

                            <h3 className="profile-modal-title">Update Profile Image</h3>

                            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                                {selectedFile ? (
                                    <img
                                        src={URL.createObjectURL(selectedFile)}
                                        alt="Preview"
                                        className="profile-image-preview"
                                    />
                                ) : (
                                    <FaCamera size={60} color="#555" />
                                )}
                            </div>

                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ width: "100%", paddingRight: selectedFile ? "30px" : "0" }}
                                />

                                {selectedFile && (
                                    <span
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                            }
                                        }}
                                        style={{
                                            position: "absolute",
                                            right: "8px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            cursor: "pointer",
                                            fontSize: "16px",
                                            color: "#888",
                                        }}
                                    >
                                        ✖
                                    </span>
                                )}
                            </div>

                            <div className="profile-modal-buttons">
                                <button
                                    className="profile-modal-save"
                                    onClick={handleSaveProfileImage}
                                    disabled={!selectedFile}
                                    style={{
                                        cursor: selectedFile ? "pointer" : "not-allowed",
                                        opacity: selectedFile ? 1 : 0.5
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal" onClick={() => setShowModal(false)}>
                    <div className="modal-body" onClick={(e) => e.stopPropagation()}>
                        <h3>Punch History</h3>
                        {Object.keys(history).length === 0 ? (
                            <p>No history found.</p>
                        ) : (Object.keys(history).map((dateKey, idx) => (
                            <div key={idx} className="modal-content">
                                <strong>{dateKey}</strong>
                                <ul> {history[dateKey].map((entry, i) => (
                                    <li key={i}> Punch In: {entry.start} | Punch Out: {entry.end} | Duration: {entry.duration} </li>))}
                                </ul>
                            </div>)))}
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}

        </header>
    );
}

export default Header;
