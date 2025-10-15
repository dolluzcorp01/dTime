import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Project_details from "./Project_details";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/Project_details" element={<Project_details />} />
      <Route path="/" element={<Navigate to="/Login" />} />
    </Routes>
  );
}

export default App;
