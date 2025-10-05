import React, { useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

// username = "crialp1ra";
// password = "elecciones1ralp784";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="relative min-h-screen">
      <img
        src="/images.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Overlay para contraste */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="card w-full max-w-md space-y-4"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <h1 className="text-center text-2xl font-semibold">
            Elecciones 2025
          </h1>

          <input
            className="input w-full"
            placeholder="Usuario"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="input w-full"
            placeholder="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="text-sm" style={{ color: "#dc2626" }}>
              {error}
            </div>
          )}

          <button className="btn w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p
            className="pt-1 text-center text-xs"
            style={{
              color: "rgba(255,255,255,0.9)",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            © {new Date().getFullYear()} Elecciones 2025
          </p>
        </form>
      </div>
    </div>
  );
}
