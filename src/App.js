import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Holiday from "./Holiday";
import My_leave_requests from "./My_leave_requests";
import Timesheet_entry from "./Timesheet_entry";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/Holiday" element={<Holiday />} />
      <Route path="/My_leave_requests" element={<My_leave_requests />} />
      <Route path="/Timesheet_entry" element={<Timesheet_entry />} />
      <Route path="/" element={<Navigate to="/Login" />} />
    </Routes>
  );
}

export default App;
