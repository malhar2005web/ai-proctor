import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import RoleSelection from "./components/RoleSelection";
import LoginPage from "./components/Login";
import MainApp from "./MainApp";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/yolov5-tfjs">
    <Routes>
      {/* Root page = Role Selection */}
      <Route path="/" element={<RoleSelection />} />

      {/* Login page */}
      <Route path="/login/:role" element={<LoginPage />} />

      {/* App page (candidate/interviewer logic handled inside MainApp) */}
      <Route path="/app" element={<MainApp />} />
    </Routes>
  </BrowserRouter>
);