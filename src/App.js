import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./Login";
import LeftNavbar from "./left_navbar";
import Header from "./Header";
import Holiday from "./Holiday";
import Leave_approvals from "./Leave_approvals";
import My_leave_requests from "./My_leave_requests";
import Timesheet_entry from "./Timesheet_entry";
import Leave_dashboard from "./Leave_dashboard";

function App() {
  const [navSize, setNavSize] = useState("full");
  const location = useLocation();

  // ✅ Hide LeftNavbar on specific pages
  const path = location.pathname.toLowerCase();
  const shouldHideNavbar = path === "/login" || path === "/thank-you";

  // ✅ Optional: force scroll to top on route change (helps prevent UI glitches)
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {/* ✅ Render Login & Thank You separately */}
      {shouldHideNavbar ? (
        <Routes>
          <Route path="/" element={<Navigate to="/Login" />} />
          <Route path="/Login" element={<Login />} />
        </Routes>
      ) : (
        // ✅ Main layout only for logged-in sections
        <div className="main-layout">
          <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
          <Header />
          <div className={`main-content ${navSize}`}>
            <Routes>
              <Route path="/" element={<Navigate to="/Login" />} />
              <Route path="/Login" element={<Login />} />
              <Route path="/Holiday" element={<Holiday navSize={navSize} />} />
              <Route path="/Leave_approvals" element={<Leave_approvals navSize={navSize} />} />
              <Route path="/My_leave_requests" element={<My_leave_requests navSize={navSize} />} />
              <Route path="/Timesheet_entry" element={<Timesheet_entry navSize={navSize} />} />
              <Route path="/Leave_dashboard" element={<Leave_dashboard navSize={navSize} />} />
            </Routes>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
