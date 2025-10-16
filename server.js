const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const port = 4003;

// CORS setup
app.use(cors({
    origin: ["http://localhost:3000"],
    credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Routes
const LoginRoutes = require('./src/backend_routes/Login_server');
const EmployeeRoutes = require('./src/backend_routes/Employee_server');
const PunchRoutes = require('./src/backend_routes/Punch_server');
const ConfigurationRoutes = require('./src/backend_routes/Configuration_server');

app.use("/api/login", LoginRoutes);
app.use("/api/employee", EmployeeRoutes);
app.use("/api/punch", PunchRoutes);
app.use("/api/Configuration", ConfigurationRoutes);

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
