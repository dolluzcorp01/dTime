import React, { useState, useEffect } from "react";
import LeftNavbar from "./left_navbar";
import Header from "./Header";
import "./Configuration.css";
import { apiFetch } from "./utils/api";

function Configuration() {
    const [navSize, setNavSize] = useState("full");
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState("");
    const [editProject, setEditProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState("");
    const [editTask, setEditTask] = useState(null);

    // Convert ISO date string to "YYYY-MM-DD HH:mm:ss"
    const formatDateTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
        const day = String(date.getDate()).padStart(2, "0");

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Fetch all projects on load
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await apiFetch("/api/Configuration/all");
            const data = await res.json();
            setProjects(data);

            if (data.length > 0) {
                fetchTasks(data[0].project_id); // ✅ Auto-select first project
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    const addProject = async () => {
        if (!newProjectName.trim()) return alert("Enter project name");
        const createdBy = localStorage.getItem("emp_id");

        const res = await apiFetch("/api/Configuration/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_name: newProjectName, created_by: createdBy })
        });

        const data = await res.json();
        if (data.success) {
            setNewProjectName("");
            fetchProjects();
        }
    };

    const updateProject = async () => {
        const updatedBy = localStorage.getItem("emp_id");

        const res = await apiFetch(`/api/Configuration/update/${editProject.auto_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_name: editProject.project_name, updated_by: updatedBy })
        });

        const data = await res.json();
        if (data.success) {
            setEditProject(null);
            fetchProjects();
        }
    };

    const deleteProject = async (auto_id) => {
        const deletedBy = localStorage.getItem("emp_id");

        await apiFetch(`/api/Configuration/delete/${auto_id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleted_by: deletedBy })
        });

        fetchProjects();
    };

    // 🔹 Fetch tasks for a selected project
    const fetchTasks = async (project_id) => {
        setSelectedProject(project_id);
        const res = await apiFetch(`/api/Configuration/tasks/${project_id}`);
        const data = await res.json();

        // ✅ Ensure tasks is always an array
        setTasks(Array.isArray(data) ? data : []);
    };

    // 🔹 Add New Task
    const addTask = async () => {
        if (!newTask.trim()) return alert("Enter task description");
        const createdBy = localStorage.getItem("emp_id");

        await apiFetch("/api/Configuration/tasks/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: selectedProject, task_desc: newTask, created_by: createdBy })
        });

        setNewTask("");
        fetchTasks(selectedProject);
    };

    // 🔹 Update Task
    const updateTask = async () => {
        const updatedBy = localStorage.getItem("emp_id");

        await apiFetch(`/api/Configuration/tasks/update/${editTask.auto_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_desc: editTask.task_desc, updated_by: updatedBy })
        });

        setEditTask(null);
        fetchTasks(selectedProject);
    };

    // 🔹 Delete Task
    const deleteTask = async (auto_id) => {
        const deletedBy = localStorage.getItem("emp_id");

        await apiFetch(`/api/Configuration/tasks/delete/${auto_id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleted_by: deletedBy })
        });

        fetchTasks(selectedProject);
    };

    return (
        <div className="project-details-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <Header />

            <div className={`content-area ${navSize}`}>
                {/* PROJECT SECTION */}
                <h1>Project Details</h1>

                <div className="add-project">
                    <input
                        type="text"
                        placeholder="Enter Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <button onClick={addProject}>Add Project</button>
                </div>

                <table className="project-table">
                    <thead>
                        <tr>
                            <th>Project ID</th>
                            <th>Project Name</th>
                            <th>Created By</th>
                            <th>Created Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((proj) => (
                            <tr
                                key={proj.auto_id}
                                onClick={() => fetchTasks(proj.project_id)}
                                className={selectedProject === proj.project_id ? "selected-row" : ""}
                            >
                                <td>{proj.project_id}</td>
                                <td>
                                    {editProject?.auto_id === proj.auto_id ? (
                                        <input
                                            type="text"
                                            value={editProject.project_name}
                                            onChange={(e) =>
                                                setEditProject({
                                                    ...editProject,
                                                    project_name: e.target.value,
                                                })
                                            }
                                        />
                                    ) : (
                                        proj.project_name
                                    )}
                                </td>
                                <td>{proj.created_by}</td>
                                <td>{formatDateTime(proj.created_time)}</td>
                                <td>
                                    {editProject?.auto_id === proj.auto_id ? (
                                        <>
                                            <button onClick={updateProject}>Save</button>
                                            <button onClick={() => setEditProject(null)}>Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setEditProject(proj)}>Edit</button>
                                            <button onClick={() => deleteProject(proj.auto_id)}>Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* TASK SECTION BELOW */}
                {selectedProject && (
                    <div className="task-section">
                        <h2>Tasks for {selectedProject}</h2>

                        <div className="add-project">
                            <input
                                type="text"
                                placeholder="Enter Task Description"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                            />
                            <button onClick={addTask}>Add Task</button>
                        </div>

                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Task Description</th>
                                    <th>Created By</th>
                                    <th>Created Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(tasks) && tasks.length > 0 ? (
                                    tasks.map((task) => (
                                        <tr key={task.auto_id}>
                                            <td>
                                                {editTask?.auto_id === task.auto_id ? (
                                                    <input
                                                        type="text"
                                                        value={editTask.task_desc}
                                                        onChange={(e) =>
                                                            setEditTask({ ...editTask, task_desc: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    task.task_desc
                                                )}
                                            </td>
                                            <td>{task.created_by}</td>
                                            <td>{formatDateTime(task.created_time)}</td>
                                            <td>
                                                {editTask?.auto_id === task.auto_id ? (
                                                    <>
                                                        <button onClick={updateTask}>Save</button>
                                                        <button onClick={() => setEditTask(null)}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setEditTask(task)}>Edit</button>
                                                        <button onClick={() => deleteTask(task.auto_id)}>Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", padding: "10px", color: "gray" }}>
                                            No tasks available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

}

export default Configuration;
