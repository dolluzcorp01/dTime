import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Configuration from "./Configuration";
import Timesheet_entry from "./Timesheet_entry";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/Configuration" element={<Configuration />} />
      <Route path="/Timesheet_entry" element={<Timesheet_entry />} />
      <Route path="/" element={<Navigate to="/Login" />} />
    </Routes>
  );
}

export default App;
