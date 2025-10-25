import React, { useState, useEffect } from "react";
import LeftNavbar from "./left_navbar";
import Header from "./Header";
import { Modal, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import "./Holiday.css";
import { apiFetch } from "./utils/api";

function Holiday() {
    const [navSize, setNavSize] = useState("full");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [showModal, setShowModal] = useState(false);
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

        setShowModal(true);
    };

    const saveHoliday = async () => {
        const existingHoliday = notes[selectedDay];

        const start_date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

        const end_date = multiDay ? endDay : start_date;

        const payload = {
            holiday_date: start_date,
            holiday_end: end_date,
            holiday_name: holidayName,
            holiday_for: holidayFor,
            holiday_value: specificValue,
            edited_by: empId,
            created_by: empId
        };

        try {
            const res = existingHoliday
                ? await apiFetch(`/api/holiday/update/${existingHoliday.holiday_id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                : await apiFetch("/api/holiday/save-holiday", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

            const data = await res.json();

            if (data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Holiday Saved",
                    text: "The holiday has been added or updated successfully"
                });

                fetchHolidays();
                setShowModal(false);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Save Failed",
                    text: data.error || "Something went wrong"
                });
            }

        } catch (err) {
            console.error("❌ Save error:", err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to save holiday. Please try again."
            });
        }
    };

    const deleteHoliday = async () => {
        if (!notes[selectedDay]) return;

        Swal.fire({
            title: "Are you sure?",
            text: "This holiday will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await apiFetch(`/api/holiday/delete/${notes[selectedDay].holiday_id}`, {
                        method: "DELETE"
                    });
                    const data = await res.json();

                    if (data.success) {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "The holiday has been removed."
                        });
                        fetchHolidays();
                        setShowModal(false);
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Delete Failed",
                            text: data.error || "Something went wrong"
                        });
                    }
                } catch (err) {
                    console.error("❌ Delete error:", err);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Failed to delete holiday. Please try again."
                    });
                }
            }
        });
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
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <Header />

            <div className={`holiday-wrapper ${navSize}`}>
                <h2>Holiday Calendar</h2>

                <div className="calendar">
                    <div className="calendar-header">
                        {currentDate.getMonth() !== 0 && (
                            <Button className="month-btn" onClick={prevMonth}>Prev</Button>
                        )}

                        <div className="month-title">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </div>

                        {currentDate.getMonth() !== 11 && (
                            <Button className="month-btn" onClick={nextMonth}>Next</Button>
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

                {/* Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {selectedDay} {monthNames[currentDate.getMonth()]}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {/* Holiday For */}
                        <label className="form-label">Holiday For</label>
                        <select
                            className="form-select"
                            value={holidayFor}
                            onChange={(e) => setHolidayFor(e.target.value)}
                        >
                            <option value="">Select</option>
                            <option value="department">Department</option>
                            <option value="job_position">Job Position</option>
                            <option value="location">Location</option>
                        </select>

                        {/* Dependent Dropdown */}
                        {holidayFor && (
                            <>
                                <label className="form-label mt-3">
                                    Select {holidayFor.replace("_", " ")}
                                </label>
                                <select
                                    className="form-select"
                                    value={specificValue}
                                    onChange={(e) => setSpecificValue(e.target.value)}
                                >
                                    <option value="">Select</option>
                                    {(holidayFor === "department" ? departments :
                                        holidayFor === "job_position" ? job_positions :
                                            locations)?.map((item, index) => (
                                                <option key={index} value={item}>{item}</option>
                                            ))}
                                </select>
                            </>
                        )}

                        {/* Holiday Name */}
                        <label className="form-label mt-3">Holiday Name</label>
                        <input
                            className="form-control"
                            type="text"
                            value={holidayName}
                            onChange={(e) => setHolidayName(e.target.value)}
                            placeholder="Enter holiday name"
                        />

                        {/* Apply Multiple Days */}
                        <div className="mt-3">
                            <input
                                type="checkbox"
                                checked={multiDay}
                                onChange={() => setMultiDay(!multiDay)}
                            />
                            <span className="ms-2">Apply holiday for multiple days</span>
                        </div>

                        {/* End Date */}
                        {multiDay && (
                            <>
                                <label className="form-label mt-2">End Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={endDay}
                                    min={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
                                    onChange={(e) => {
                                        setEndDay(e.target.value);
                                    }}
                                />
                            </>
                        )}

                    </Modal.Body>
                    <Modal.Footer>
                        {notes[selectedDay] && (
                            <Button variant="danger" onClick={deleteHoliday}>
                                Delete
                            </Button>
                        )}
                        <Button variant="success" onClick={saveHoliday}>Save</Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </div>
    );
}

export default Holiday;
