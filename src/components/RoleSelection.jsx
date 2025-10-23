import React from "react";
import { useNavigate } from "react-router-dom";

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleSelect = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#f3f4f6",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Select Role</h1>
      <div style={{ marginTop: "20px" }}>
        <button
          style={{
            padding: "10px 20px",
            marginRight: "20px",
            background: "#4CAF50",
            border: "none",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
          }}
          onClick={() => handleSelect("candidate")}
        >
          Candidate
        </button>

        <button
          style={{
            padding: "10px 20px",
            background: "#007BFF",
            border: "none",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
          }}
          onClick={() => handleSelect("interviewer")}
        >
          Interviewer
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;