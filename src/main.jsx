import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";
import Login from "./pages/Login.jsx";
import DashboardAdmin from "./pages/DashboardAdmin.jsx";
import PanelComisaria from "./pages/PanelComisaria.jsx";
import { useAuthStore } from "./store/auth.js";

function AuthGate({ children }) {
  // esperamos a que zustand rehidrate desde localStorage
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const has = useAuthStore.persist?.hasHydrated?.() ?? true;
    if (has) setHydrated(true);
    const unsub = useAuthStore.persist?.onFinishHydration?.(() =>
      setHydrated(true)
    );
    return () => {
      unsub && unsub();
    };
  }, []);

  // si el token está vencido, deslogueamos
  React.useEffect(() => {
    const { token, logout, isTokenExpired } = useAuthStore.getState();
    if (token && isTokenExpired()) logout();
    const id = setInterval(() => {
      const { token, logout, isTokenExpired } = useAuthStore.getState();
      if (token && isTokenExpired()) logout();
    }, 60 * 1000); // chequeo cada minuto
    return () => clearInterval(id);
  }, []);

  if (!hydrated) return null; // o un spinner si querés
  return children;
}

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const user = useAuthStore((s) => s.user);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGate>
              <PrivateRoute>
                {user?.role === "admin" ? (
                  <DashboardAdmin />
                ) : (
                  <PanelComisaria />
                )}
              </PrivateRoute>
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<App />);
