import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo_eagle from "./assets/img/logo_eagle.png";
import { apiFetch } from "./utils/api";
import "./Holiday.css";

function Holiday({ navSize }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [notes, setNotes] = useState({});
    const [holidayList, setHolidayList] = useState([]);
    const [loggedInEmp, setLoggedInEmp] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [empId, setEmpId] = useState(null);
    const navigate = useNavigate();

    const realYear = new Date().getFullYear();
    const minYear = realYear - 1;
    const maxYear = realYear + 1;
 
    const [multiHolidayModal, setMultiHolidayModal] = useState(false);
    const [selectedHolidayList, setSelectedHolidayList] = useState([]);


    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        const id = localStorage.getItem("emp_id");
        setEmpId(id);
    }, []);

    useEffect(() => {
        if (empId && employees.length > 0) {
            const emp = employees.find(e => e.emp_id == empId);
            if (emp) {
                setLoggedInEmp(emp);
                if ((emp.emp_access_level !== "Admin" && emp.emp_access_level !== "Sub Admin")) {
                    navigate("/login");
                }
            }
        }
    }, [empId, employees]);

    useEffect(() => {
        if (empId && employees.length > 0) {
            const emp = employees.find(e => e.emp_id == empId);
            if (emp) {
                setLoggedInEmp(emp);
                if (emp.emp_access_level !== "Admin" && emp.emp_access_level !== "Sub Admin") {
                    navigate("/login");
                }
            }

            fetchHolidays();
        }
    }, [empId, employees, currentDate]);

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch(`/api/employee/all`);
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    const fetchHolidays = async () => {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        try {
            const res = await apiFetch(`/api/holiday/list?month=${month}&year=${year}&emp_id=${empId}`);
            const data = await res.json();
            setHolidayList(data);

            const holidayMarks = {};
            data.forEach(h => {
                const start = new Date(h.holiday_date);
                const end = h.holiday_end ? new Date(h.holiday_end) : start;

                let current = new Date(start);
                while (current <= end) {
                    const day = current.getDate();
                    if (!holidayMarks[day]) holidayMarks[day] = [];
                    holidayMarks[day].push(h);
                    current.setDate(current.getDate() + 1);
                }
            });

            setNotes(holidayMarks);
        } catch (err) {
            console.error("❌ Fetch error:", err);
        }
    };

    const generateColorFromName = (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };

    const handleDayClick = (day) => {
        if (!day) return;
        setSelectedDay(day);

        const list = notes[day];   // list of holidays for day

        if (list && list.length > 1) {
            setSelectedHolidayList(list);
            setMultiHolidayModal(true);
            return;
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        generateCalendar();
    }, [currentDate, notes]);

    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const tempDays = [];
        for (let i = 0; i < firstDay; i++) {
            tempDays.push("");
        }
        for (let d = 1; d <= daysInMonth; d++) {
            tempDays.push(d);
        }

        setCalendarDays(tempDays);
    };

    const prevMonth = () => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();

        // Block going below minYear January
        if (y === minYear && m === 0) return;

        setCurrentDate(new Date(y, m - 1, 1));
    };

    const nextMonth = () => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();

        // Block going above maxYear December
        if (y === maxYear && m === 11) return;

        setCurrentDate(new Date(y, m + 1, 1));
    };

    return (
        <div className="holiday-container">
            <div className={`holiday-dashboard ${navSize}`}>
                <div className="header-wrapper">
                    <h2>
                        <a className="navbar-brand" href="#">
                            <img
                                src={logo_eagle}
                                alt="dAdmin Logo"
                                style={{
                                    height: "50px",
                                    objectFit: "contain",
                                    marginLeft: "-20px",
                                }}
                            />
                        </a>
                        Holiday Calendar
                    </h2>
                </div>

                <div className={`holiday-dashboard-content`}>
                    <div className="calendar">
                        <div className="calendar-header">

                            {/* Hide Prev only if we are at minYear January */}
                            {!(currentDate.getFullYear() === minYear && currentDate.getMonth() === 0) && (
                                <button className="month-btn" onClick={prevMonth}>Prev</button>
                            )}

                            <div className="month-title">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </div>

                            {/* Hide Next only if we are at maxYear December */}
                            {!(currentDate.getFullYear() === maxYear && currentDate.getMonth() === 11) && (
                                <button className="month-btn" onClick={nextMonth}>Next</button>
                            )}

                        </div>

                        <table className="calendar-table">
                            <thead>
                                <tr>
                                    <th>Sun</th><th>Mon</th><th>Tue</th>
                                    <th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
                                </tr>
                            </thead>

                            <tbody>
                                {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, i) => (
                                            <td
                                                key={i}
                                                className={day && notes[day] ? "holiday-day" : ""}
                                                onClick={() => handleDayClick(day)}
                                            >
                                                {day}
                                                {day && notes[day] && (
                                                    <div
                                                        className="holiday-list"
                                                        title={notes[day].map(h => h.holiday_name).join(", ")} // show on hover
                                                    >
                                                        {notes[day].slice(0, 2).map((h, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="holiday-chip"
                                                                style={{ backgroundColor: generateColorFromName(h.holiday_name) }}
                                                            >
                                                                {h.holiday_name}
                                                            </div>
                                                        ))}

                                                        {notes[day].length > 2 && (
                                                            <div className="holiday-chip more-chip">
                                                                +{notes[day].length - 2} more
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {multiHolidayModal && (
                        <div className="multi-modal-overlay" onClick={() => setMultiHolidayModal(false)}>
                            <div className="multi-modal-content" onClick={(e) => e.stopPropagation()}>
                                <h3>Holidays on {selectedDay} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                                <div
                                    className="holiday-close-icon"
                                    onClick={() => setMultiHolidayModal(false)}
                                    title="Close"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </div>

                                {selectedHolidayList.map((h, i) => (
                                    <div key={i} className="multi-holiday-row">
                                        <span>{h.holiday_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Holiday;
