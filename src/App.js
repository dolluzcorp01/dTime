import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Configuration from "./Configuration";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/Configuration" element={<Configuration />} />
      <Route path="/" element={<Navigate to="/Login" />} />
    </Routes>
  );
}

export default App;
