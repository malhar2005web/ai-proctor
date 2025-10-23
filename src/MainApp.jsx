// MainApp.jsx
import React, { useState, useEffect } from "react";
import App from "./App"; // candidate side
import Interviewer from "./Interviewer";

const MainApp = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const userRole = localStorage.getItem("role"); // "candidate" or "interviewer"
    const token = localStorage.getItem("sessionToken");

    if (userRole && token) {
      setRole(userRole);
      setLoggedIn(true);
    }
  }, []);

  if (!loggedIn) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "20px",
        }}
      >
        Please login first.
      </div>
    );
  }

  // Show different app based on role
  return role === "candidate" ? <App /> : <Interviewer />;
};

export default MainApp;