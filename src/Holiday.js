import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "./Holiday.css";
import { apiFetch } from "./utils/api";

function Holiday({ navSize }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [note, setNote] = useState("");
    const [notes, setNotes] = useState({});

    const departments = ["Development", "Testing", "HR", "Support"];
    const job_positions = ["Manager", "Team lead", "HR", "Senior Developer", "Junior Developer", "Data Management"];
    const locations = ["Chennai", "Hyderabad", "Pune, Nagpur"];

    const [holidayFor, setHolidayFor] = useState("");
    const [specificValue, setSpecificValue] = useState("");
    const [holidayName, setHolidayName] = useState("");
    const [multiDay, setMultiDay] = useState(false);
    const [endDay, setEndDay] = useState("");
    const [empId, setEmpId] = useState(null);
    const [holidayList, setHolidayList] = useState([]);

    useEffect(() => {
        const id = localStorage.getItem("emp_id");
        setEmpId(id);
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [currentDate]);

    const fetchHolidays = async () => {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        try {
            const res = await apiFetch(`/api/holiday/list?month=${month}&year=${year}`);
            const data = await res.json();

            setHolidayList(data);

            const holidayMarks = {};
            data.forEach(h => {
                const day = new Date(h.holiday_date).getDate();
                holidayMarks[day] = h; // Store holiday info
            });

            setNotes(holidayMarks); // Use notes to mark UI
        } catch (err) {
            console.error("❌ Fetch error:", err);
        }
    };

    const normalizeDate = (dateString) => {
        if (!dateString) return "";
        return dateString.split("T")[0]; // Keeps only yyyy-MM-dd
    };

    const handleDayClick = (day) => {
        if (!day) return;
        setSelectedDay(day);

        const holiday = notes[day];

        if (holiday) {
            const formattedStart = normalizeDate(holiday.holiday_date);
            const formattedEnd = normalizeDate(holiday.holiday_end);

            setHolidayName(holiday.holiday_name);
            setHolidayFor(holiday.holiday_for);
            setSpecificValue(holiday.holiday_value);

            const isMulti = formattedEnd && formattedEnd !== formattedStart;
            setMultiDay(isMulti);
            setEndDay(isMulti ? formattedEnd : "");
        } else {
            setHolidayName("");
            setHolidayFor("");
            setSpecificValue("");
            setMultiDay(false);
            setEndDay("");
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
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div className="holiday-container">
            <div className={`holiday-dashboard ${navSize}`}>
                <div className="holiday-config-content">
                    <h2 style={{ marginBottom: "15px" }}>Holiday Calendar</h2>
                    <div className="calendar">
                        <div className="calendar-header">
                            {currentDate.getMonth() !== 0 && (
                                <button className="month-btn" onClick={prevMonth}>Prev</button>
                            )}

                            <div className="month-title">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </div>

                            {currentDate.getMonth() !== 11 && (
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
                                                    <div className="holiday-label" title={notes[day].holiday_name}>
                                                        {notes[day].holiday_name}
                                                    </div>
                                                )}
                                            </td>
                                        ))}
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

export default Holiday;
