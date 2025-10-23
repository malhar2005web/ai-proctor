import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const { role } = useParams(); // candidate / interviewer

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Just for demo – normally you’d verify from backend
    if (username && password && sessionToken) {
      localStorage.setItem("role", role);
      localStorage.setItem("sessionToken", sessionToken);
      navigate("/app"); // redirect to App.jsx page
    } else {
      alert("Please fill all fields");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-semibold mb-4 capitalize">
          {role} Login
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full border rounded-lg px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="Session Token"
            className="w-full border rounded-lg px-3 py-2"
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}