import React, { useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("crialp1ra");
  const [password, setPassword] = useState("elecciones1ralp784");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { username, password });
      setAuth(data.token, data.user);
      nav("/");
    } catch (e) {
      setError(e.response?.data?.error || "Error de login");
    } finally {
      setLoading(false);
    }
  }

  // ADD IMAGE BACKGROUND

  return (
    <div className="h-screen flex items-center justify-center backgroundImage('login.jpg')">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3">
        <h1 className="text-xl font-semibold text-center">Elecciones 2025</h1>
        <input
          className="input"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
