import React, { useState, useEffect } from "react";
import { FaCommentDots, FaPlusCircle, FaMinusCircle } from "react-icons/fa";
import "./Timesheet_entry.css";
import { apiFetch } from "./utils/api";

const Timesheet_entry = ({ navSize }) => {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedTask, setSelectedTask] = useState("");
    const [projectName, setProjectName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");

    const [onsiteOffshore, setOnsiteOffshore] = useState("OF");
    const [clientBillable, setClientBillable] = useState("Billable");
    const [billingLocation, setBillingLocation] = useState("");

    const [weeklyPunchHours, setWeeklyPunchHours] = useState(Array(7).fill("00:00"));

    // 🔹 Fetch all projects
    const fetchProjects = async () => {
        try {
            const res = await apiFetch("/api/Project_configuration/all", {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();
            setProjects(data);
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    // 🔹 Fetch tasks based on project ID
    const fetchTasks = async (project_id) => {
        setSelectedProject(project_id);
        try {
            const res = await apiFetch(`/api/Project_configuration/tasks/${project_id}`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
            const selectedProj = projects.find((p) => p.project_id === project_id);
            if (selectedProj) setProjectName(selectedProj.project_name);
        } catch (err) {
            console.error("Error fetching tasks:", err);
        }
    };

    // 🔹 Handle task selection
    const handleTaskSelect = (task_id) => {
        setSelectedTask(task_id);
        const selectedTaskObj = tasks.find((t) => t.task_id === task_id);
        if (selectedTaskObj) setTaskDescription(selectedTaskObj.task_desc);
    };

    // Utility: Convert milliseconds to HH:mm
    const formatDuration = (ms) => {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Calculate total hours per day
    const calculateWeeklyPunchHours = (punchHistory) => {
        const weeklyHours = Array(7).fill(0); // Index 0=Sun, 1=Mon,...

        punchHistory.forEach(entry => {
            if (entry.punch_in && entry.punch_out) {
                const inDate = new Date(entry.punch_in);
                const outDate = new Date(entry.punch_out);
                const duration = outDate - inDate; // in ms

                const dayIndex = inDate.getDay(); // 0-6
                weeklyHours[dayIndex] += duration;
            }
        });

        return weeklyHours.map(ms => ms > 0 ? formatDuration(ms) : "00:00");
    };

    useEffect(() => {
        const fetchPunchHistory = async () => {
            const res = await apiFetch(`/api/punch/history`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();
            setWeeklyPunchHours(calculateWeeklyPunchHours(data));
        };
        fetchPunchHistory();
    }, []);

    const calculateTotalHours = (weeklyHours) => {
        let totalMinutes = 0;

        weeklyHours.forEach(time => {
            const [hrs, mins] = time.split(":").map(Number);
            totalMinutes += hrs * 60 + mins;
        });

        const totalHrs = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;

        return `${String(totalHrs).padStart(2, '0')}:${String(totalMins).padStart(2, '0')}`;
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return (
        <div className="timesheet-container">
            <div className={`timesheet-dashboard ${navSize}`}>
                <div className="timesheet-config-content">
                    <h1>Timesheet Entry</h1>
                    <div className="table-wrapper">
                        <table className="timesheet-table">
                            <thead>
                                <tr>
                                    <th>Project ID</th>
                                    <th>Project Name</th>
                                    <th>Task/Activity ID</th>
                                    <th>Task Description</th>
                                    <th>Onsite/Offshore</th>
                                    <th>Client Billable</th>
                                    <th>Billing Location</th>
                                    <th>MON</th>
                                    <th>TUE</th>
                                    <th>WEB</th>
                                    <th>THU</th>
                                    <th>FRI</th>
                                    <th>SAT</th>
                                    <th>SUN</th>
                                    <th>Total Hours</th>
                                    <th>Comments</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        <select
                                            value={selectedProject}
                                            onChange={(e) => fetchTasks(e.target.value)}
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map((proj) => (
                                                <option key={proj.project_id} value={proj.project_id}>
                                                    {proj.project_id}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            type="text"
                                            value={projectName}
                                            placeholder="Project Name"
                                            readOnly
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={selectedTask}
                                            onChange={(e) => handleTaskSelect(e.target.value)}
                                        >
                                            <option value="">Select Task</option>
                                            {tasks.map((task) => (
                                                <option key={task.task_id} value={task.task_id}>
                                                    {task.task_id}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            type="text"
                                            value={taskDescription}
                                            placeholder="Task Description"
                                            readOnly
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={onsiteOffshore}
                                            onChange={(e) => setOnsiteOffshore(e.target.value)}
                                        >
                                            <option value="ON">ON</option>
                                            <option value="OF">OFF</option>
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={clientBillable}
                                            onChange={(e) => setClientBillable(e.target.value)}
                                        >
                                            <option value="Billable">Billable</option>
                                            <option value="Non-Billable">Non Billable</option>
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={billingLocation}
                                            onChange={(e) => setBillingLocation(e.target.value)}
                                        >
                                            <option value="">Select Location</option>
                                            <option value="Hyderabad">Hyderabad</option>
                                            <option value="Chennai">Chennai</option>
                                            <option value="Pune">Pune</option>
                                            <option value="Nagpur">Nagpur</option>
                                        </select>
                                    </td>

                                    {[...Array(7)].map((_, i) => (
                                        <td key={i}>
                                            <input type="text" className="small-input" placeholder="0" />
                                        </td>
                                    ))}

                                    <td>
                                        00:00
                                    </td>

                                    <td className="comment-icons">
                                        <FaCommentDots className="icon comment-icon" />
                                        <FaPlusCircle className="icon add-icon" />
                                        <FaMinusCircle className="icon remove-icon" />
                                    </td>

                                </tr>

                                {/* Punch In / Punch Out Row */}
                                <tr className="punch-row">
                                    <td colSpan={7} style={{ fontWeight: "bold", background: "#e7f3ff" }}>Punch In / Punch Out</td>
                                    {weeklyPunchHours.map((hours, i) => (
                                        <td key={i} style={{ textAlign: "center", fontWeight: "bold" }}>{hours}</td>
                                    ))}
                                    <td style={{ fontWeight: "bold", background: "#d0eaff" }}>
                                        {calculateTotalHours(weeklyPunchHours)}
                                    </td>
                                    <td></td>
                                </tr>

                                {/* Holiday / Time Off Row */}
                                <tr className="holiday-row">
                                    <td colSpan={7} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Holiday / Time Off</td>
                                    {[...Array(7)].map((_, i) => (
                                        <td key={i}>
                                            <input type="text" className="small-input" placeholder="0" />
                                        </td>
                                    ))}
                                    <td>
                                        00:00
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timesheet_entry;
