import React, { useState, useEffect } from "react";
import "./Header.css";
import { FaUserCircle, FaClock } from "react-icons/fa";
import logo_eagle from "./assets/img/logo_eagle.png";

function Header() {
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [history, setHistory] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [startTime, setStartTime] = useState(null);

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

    const handlePunch = () => {
        if (!isPunchedIn) {
            setIsPunchedIn(true);
            setStartTime(new Date().toLocaleTimeString());
        } else {
            setIsPunchedIn(false);
            const recordedTime = formatTime(seconds);
            console.log("Work Duration:", recordedTime);
            setHistory([...history, { start: startTime, end: new Date().toLocaleTimeString(), duration: recordedTime }]);
            setSeconds(0);
        }
    };

    return (
        <header className="app-header">
            <div className="header-left">
                <a className="navbar-brand" href="#" style={{ marginRight: "10px", marginLeft: "10px" }}>
                    <img src={logo_eagle} alt="dTime Logo" />
                </a>
                <h2>dTime</h2>
            </div>

            {/* ✅ Center Controls */}
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

                {history.length > 0 && (
                    <FaClock className="clock-icon" onClick={() => setShowModal(true)} style={{ cursor: "pointer", fontSize: "20px" }} />
                )}

            </div>

            {/* ✅ Right Section */}
            <div className="header-right">
                <span className="user-name">Welcome, Employee</span>
                <FaUserCircle className="user-icon" />
            </div>

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Punch History</h3>
                        <ul>
                            {history.map((entry, index) => (
                                <li key={index}>
                                    In: {entry.start} | Out: {entry.end} | Duration: {entry.duration}
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
