import React, { useState } from "react";
import LeftNavbar from "./left_navbar";
import Header from "./Header";
import "./Project_details.css";

function Project_Details() {
    const [navSize, setNavSize] = useState("full");

    return (
        <div className="project-details-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <Header />

            <div className={`content-area ${navSize}`}>
                <h1>Project Details</h1>
                <p>Here you can manage project-related information.</p>
            </div>
        </div>
    );
}

export default Project_Details;
