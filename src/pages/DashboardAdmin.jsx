import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../services/api";
import useSSE from "../hooks/useSSE";
import { useAuthStore } from "../store/auth";

/* -------------------- UI helpers -------------------- */
function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub != null && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Progress({ value = 0 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
    </div>
  );
}

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-3 flex items-center justify-center">
      <div className="card w-full max-w-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="btn bg-slate-200 text-slate-900 hover:bg-slate-300"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirm({ open, text, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="card w-full max-w-md space-y-3">
        <div className="text-lg font-semibold">Confirmar</div>
        <div className="text-sm">{text}</div>
        <div className="flex gap-2 justify-end">
          <button className="btn" onClick={onConfirm}>
            Sí
          </button>
          <button
            className="btn bg-slate-200 text-slate-900 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Modal Novedades (Admin) -------------------- */
function NovedadesModal({ open, onClose, school }) {
  const [filter, setFilter] = useState("all"); // all | info | incidente | logistica

  useEffect(() => {
    if (!open) setFilter("all");
  }, [open]);

  if (!open || !school) return null;

  const list = (school.novedades || [])
    .filter((n) => (filter === "all" ? true : n.type === filter))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <Modal open={open} onClose={onClose} title={`Novedades • ${school.name}`}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Tipo:</span>
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="info">Información</option>
            <option value="incidente">Incidente</option>
            <option value="logistica">Logística</option>
          </select>
        </div>

        <div className="grid gap-2 max-h-80 overflow-auto">
          {list.length ? (
            list.map((n, i) => (
              <div key={i} className="p-2 border rounded">
                <div className="text-[11px] text-slate-500">
                  {new Date(n.at).toLocaleString()} • {n.type?.toUpperCase()}
                </div>
                <div>{n.text}</div>
                {n.by && (
                  <div className="text-[11px] text-slate-400 mt-1">
                    por: {n.by}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-slate-500">
              Sin novedades para el filtro seleccionado
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* -------------------- Modal Efectivos (nuevo) -------------------- */
function EfectivosModal({ open, onClose, school }) {
  if (!open || !school) return null;
  const eff = school.effectives || [];

  const onlyDigits = (s = "") => (s || "").replace(/[^\d]/g, "");
  const waLink = (phone, msg) => {
    const digits = onlyDigits(phone || "");
    if (!digits) return null;
    const withCC = digits.length <= 12 ? `54${digits}` : digits; // AR por defecto
    const q = msg ? `?text=${encodeURIComponent(msg)}` : "";
    return `https://wa.me/${withCC}${q}`;
  };

  return (
    <Modal open={open} onClose={onClose} title={`Efectivos • ${school.name}`}>
      <div className="grid gap-2 max-h-80 overflow-auto text-sm">
        {eff.length ? (
          eff.map((e, i) => {
            const link = waLink(
              e?.phone,
              `Hola ${e?.name || ""}, te contacto por ${school.name}.`
            );
            return (
              <div key={i} className="p-2 border rounded">
                <div className="font-medium truncate">
                  {e?.name || `Agente ${i + 1}`}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-500">Jerarquía: </span>
                    {e?.rank || "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-500">Legajo: </span>
                    {e?.legajo || "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-500">Destino: </span>
                    {e?.destino || "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-500">Teléfono: </span>
                    {e?.phone ? (
                      <a
                        className="text-blue-600 underline"
                        href={`tel:${e.phone}`}
                      >
                        {e.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <a
                    className={`btn inline-flex items-center ${
                      link ? "" : "opacity-60 pointer-events-none"
                    }`}
                    href={link || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-slate-500">Sin efectivos cargados</div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------- Detalle de escuela -------------------- */
function SchoolDetail({ s, onReset, onOpenNovedades, onOpenEfectivos }) {
  const pct = s.mesasAssigned
    ? Math.round((s.mesasOpen / s.mesasAssigned) * 100)
    : 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{s.name}</div>
          {s.address && (
            <div className="text-xs text-slate-500 truncate">{s.address}</div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                s.isOpen
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-200 text-slate-800"
              }`}
            >
              {s.isOpen ? "Abierta" : "Cerrada"}
            </span>
            <span className="text-xs text-slate-500">
              Mesas: {s.mesasOpen}/{s.mesasAssigned || 0} ({pct}%)
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={onOpenEfectivos}>
            👮 Efectivos{" "}
            {s.effectives?.length || 0 ? `(${s.effectives.length})` : ""}
          </button>
          <button className="btn" onClick={onOpenNovedades}>
            🔔 Novedades{" "}
            {s.novedades?.length || 0 ? `(${s.novedades.length})` : ""}
          </button>
          <button
            className="btn bg-red-600 hover:bg-red-700 text-white"
            onClick={onReset}
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={pct} />
        <div className="text-[11px] text-slate-500">
          Porcentaje de mesas abiertas
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
        <div>
          <span className="text-slate-500">Comisaría: </span>
          {s.station?.name || "-"}
        </div>
        <div>
          <span className="text-slate-500">Puertas: </span>
          {s.doorsClosed ? "Cerradas" : "—"}
        </div>
        <div>
          <span className="text-slate-500">Pend. adentro: </span>
          {s.pendingVoters || 0}
        </div>
        <div>
          <span className="text-slate-500">Escrutadas: </span>
          {s.mesasScrutadas || 0}
        </div>
        <div>
          <span className="text-slate-500">Urnas: </span>
          {s.urnsRetrieved ? "Sí" : "No"}
        </div>
        <div>
          <span className="text-slate-500">Cierre definitivo: </span>
          {s.finalClose ? "Sí" : "No"}
        </div>
      </div>

      {/* resumen novedades */}
      <div>
        <div className="font-medium mb-1 text-sm">Últimas novedades</div>
        <div className="grid gap-2">
          {(s.novedades || []).slice(0, 3).map((n, i) => (
            <div key={i} className="p-2 rounded border text-sm">
              <div className="text-[11px] text-slate-500">
                {new Date(n.at).toLocaleString()} • {n.type?.toUpperCase()}
              </div>
              <div className="truncate">{n.text}</div>
            </div>
          ))}
          {(!s.novedades || s.novedades.length === 0) && (
            <div className="text-slate-500 text-sm">Sin novedades</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Página -------------------- */
export default function DashboardAdmin() {
  const [schools, setSchools] = useState([]);
  const [sel, setSel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [stationId, setStationId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [novModal, setNovModal] = useState(null);
  const [effModal, setEffModal] = useState(null);
  const logout = useAuthStore((s) => s.logout);

  const load = useCallback(async () => {
    const { data } = await api.get("/admin/schools");
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
    setSchools(sorted);

    if (stationId) {
      const existsStation = sorted.some((s) => s.station?._id === stationId);
      if (!existsStation) setStationId("");
    }
    if (schoolId) {
      const existsSchool = sorted.some((s) => s._id === schoolId);
      if (!existsSchool) setSchoolId("");
    }
  }, [stationId, schoolId]);

  useEffect(() => {
    load();
  }, [load]);
  useSSE(() => load());

  // lista de comisarías derivada
  const stations = useMemo(() => {
    const map = new Map();
    for (const s of schools)
      if (s.station?._id && s.station?.name)
        map.set(s.station._id, s.station.name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [schools]);

  // aplicar filtro por comisaría
  const schoolsByStation = useMemo(
    () =>
      stationId ? schools.filter((s) => s.station?._id === stationId) : schools,
    [schools, stationId]
  );

  // escuela seleccionada (si se eligió en el selector)
  const selectedSchool = useMemo(
    () => schoolsByStation.find((s) => s._id === schoolId),
    [schoolsByStation, schoolId]
  );

  // KPIs
  const kpis = useMemo(() => {
    const src = selectedSchool ? [selectedSchool] : schoolsByStation;
    const locals = src.length;
    const openLocals = src.filter((s) => s.isOpen).length;
    const mesasAssigned = src.reduce((a, s) => a + (s.mesasAssigned || 0), 0);
    const mesasOpen = src.reduce((a, s) => a + (s.mesasOpen || 0), 0);
    const percentOpen = mesasAssigned
      ? Math.round((mesasOpen / mesasAssigned) * 10000) / 100
      : 0;
    const pendientesApertura = Math.max(0, mesasAssigned - mesasOpen);

    const cierrePuertas = src.filter((s) => s.doorsClosed).length;
    const sinVotantes = src.filter(
      (s) => s.doorsClosed && (s.pendingVoters || 0) === 0
    ).length;
    const pctSinVotantes = cierrePuertas
      ? Math.round((sinVotantes / cierrePuertas) * 10000) / 100
      : 0;
    const mesasScrutadas = src.reduce((a, s) => a + (s.mesasScrutadas || 0), 0);
    const pctEscrutinio = mesasAssigned
      ? Math.round((mesasScrutadas / mesasAssigned) * 10000) / 100
      : 0;
    const retiroUrnas = src.filter((s) => s.urnsRetrieved).length;
    const cierreDefinitivo = src.filter((s) => s.finalClose).length;

    const totalNov = src.reduce((a, s) => a + (s.novedades?.length || 0), 0);
    const totalInc = src.reduce(
      (a, s) =>
        a + (s.novedades || []).filter((n) => n.type === "incidente").length,
      0
    );

    const hours = ["14", "15", "16", "17", "18"];
    const hourly = Object.fromEntries(
      hours.map((h) => {
        const vals = src
          .map(
            (s) => (s.hourlyReports || []).find((r) => r.hour === h)?.percent
          )
          .filter((v) => typeof v === "number");
        const avg = vals.length
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) /
            100
          : 0;
        return [h, avg];
      })
    );

    return {
      locals,
      openLocals,
      mesasAssigned,
      mesasOpen,
      percentOpen,
      pendientesApertura,
      cierrePuertas,
      sinVotantes,
      pctSinVotantes,
      mesasScrutadas,
      pctEscrutinio,
      retiroUrnas,
      cierreDefinitivo,
      hourly,
      totalNov,
      totalInc,
    };
  }, [schoolsByStation, selectedSchool]);

  const fmt = (n) =>
    typeof n === "number" ? (Number.isInteger(n) ? n : n.toFixed(2)) : "-";

  // Confirm reset
  async function doConfirm() {
    try {
      if (confirm?.run) await confirm.run();
    } finally {
      setConfirm(null);
      load();
    }
  }
  const askReset = (school) => {
    setConfirm({
      text: `Reiniciar "${school.name}" a estado inicial (se conservarán mesas totales y efectivos). ¿Continuar?`,
      run: () =>
        api.post(`/schools/${school._id}/reset`, {
          keepEffectives: true,
          keepMesasAssigned: true,
        }),
    });
  };

  // Helpers UI: badge y botones iconográficos
  const Badge = ({ count, intent = "default" }) => {
    const base =
      "ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium";
    const tone =
      intent === "danger"
        ? "bg-red-600 text-white"
        : intent === "info"
        ? "bg-blue-600 text-white"
        : "bg-slate-800 text-white";
    return <span className={`${base} ${tone}`}>{count}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel Admin</h1>
          <div className="text-xs text-slate-500">
            {stationId ? "Filtrado por comisaría" : "Todas las comisarías"}
            {schoolId ? " • Escuela seleccionada" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={useAuthStore.getState().logout}>
            Salir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 shrink-0">Comisaría</label>
          <select
            className="input w-full"
            value={stationId}
            onChange={(e) => {
              setStationId(e.target.value);
              setSchoolId("");
            }}
          >
            <option value="">Todas</option>
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 shrink-0">Escuela</label>
          <select
            className="input w-full"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            disabled={!schoolsByStation.length}
          >
            <option value="">Todas</option>
            {schoolsByStation.map((sc) => (
              <option key={sc._id} value={sc._id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">
            Mostrando:{" "}
            {schoolId
              ? "Detalle de escuela"
              : `${schoolsByStation.length} escuelas`}
          </div>
        </div>
      </div>

      {/* KPIs (matutino) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Locales" value={kpis.locals} />
        <StatCard label="Locales abiertos" value={kpis.openLocals} />
        <StatCard label="Mesas asignadas" value={kpis.mesasAssigned} />
        <StatCard
          label="Apertura de mesas"
          value={kpis.mesasOpen}
          sub={<Progress value={kpis.percentOpen} />}
        />
        <StatCard
          label="% Mesas abiertas"
          value={`${fmt(kpis.percentOpen)}%`}
        />
        <StatCard
          label="Pendientes de apertura"
          value={kpis.pendientesApertura}
        />
      </div>

      {/* KPIs (vespertino y extras) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Cierre de puertas" value={kpis.cierrePuertas} />
        <StatCard label="Sin votantes" value={kpis.sinVotantes} />
        <StatCard
          label="% Sin votantes"
          value={`${fmt(kpis.pctSinVotantes)}%`}
        />
        <StatCard label="Mesas escrutadas" value={kpis.mesasScrutadas} />
        <StatCard label="% Escrutinio" value={`${fmt(kpis.pctEscrutinio)}%`} />
        <StatCard label="Retiro de urnas" value={kpis.retiroUrnas} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Cierre definitivo" value={kpis.cierreDefinitivo} />
        <StatCard
          label="% Votantes 14hs"
          value={`${fmt(kpis.hourly["14"])}%`}
        />
        <StatCard
          label="% Votantes 15hs"
          value={`${fmt(kpis.hourly["15"])}%`}
        />
        <StatCard
          label="% Votantes 16hs"
          value={`${fmt(kpis.hourly["16"])}%`}
        />
        <StatCard
          label="% Votantes 17hs"
          value={`${fmt(kpis.hourly["17"])}%`}
        />
        <StatCard
          label="% Votantes 18hs"
          value={`${fmt(kpis.hourly["18"])}%`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Novedades" value={kpis.totalNov} />
        <StatCard label="Incidentes" value={kpis.totalInc} />
      </div>

      {/* Vista de detalle o listado */}
      {selectedSchool ? (
        <SchoolDetail
          s={selectedSchool}
          onReset={() => askReset(selectedSchool)}
          onOpenNovedades={() => setNovModal(selectedSchool)}
          onOpenEfectivos={() => setEffModal(selectedSchool)}
        />
      ) : (
        <div className="card">
          <h2 className="font-semibold mb-2">Escuelas</h2>

          {/* Desktop */}
          <div className="hidden md:block overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Escuela</th>
                  <th>Comisaría</th>
                  <th>Estado</th>
                  <th>Mesas (ab/total)</th>
                  <th>%</th>
                  <th>Efectivos</th>
                  <th>Cierre</th>
                  <th>Escrutinio</th>
                  <th>Urnas</th>
                  <th>Def.</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schoolsByStation.map((s) => {
                  const pct = s.mesasAssigned
                    ? Math.round((s.mesasOpen / s.mesasAssigned) * 100)
                    : 0;
                  const effCount = s.effectives?.length || 0;
                  const novCount = s.novedades?.length || 0;
                  const hasIncident = (s.novedades || []).some(
                    (n) => n.type === "incidente"
                  );

                  return (
                    <tr key={s._id}>
                      <td className="truncate max-w-[300px]">{s.name}</td>
                      <td className="truncate max-w-[220px]">
                        {s.station?.name}
                      </td>
                      <td>{s.isOpen ? "Abierta" : "Cerrada"}</td>
                      <td>
                        {s.mesasOpen}/{s.mesasAssigned || 0}
                      </td>
                      <td>
                        <div className="w-24">
                          <div className="flex items-center gap-2">
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      </td>
                      {/* Botón iconográfico de efectivos */}
                      <td className="whitespace-nowrap">
                        <button
                          className="btn px-2 relative"
                          title="Ver efectivos"
                          onClick={() => setEffModal(s)}
                        >
                          👮
                          <Badge count={effCount} intent="default" />
                        </button>
                      </td>
                      <td>{s.doorsClosed ? "✅" : "—"}</td>
                      <td>{s.mesasScrutadas || 0}</td>
                      <td>{s.urnsRetrieved ? "✅" : "—"}</td>
                      <td>{s.finalClose ? "✅" : "—"}</td>
                      {/* Botón iconográfico de novedades */}
                      <td className="text-center">
                        <button
                          className="btn px-2 relative"
                          title="Ver novedades"
                          onClick={() => setNovModal(s)}
                        >
                          🔔
                          <Badge
                            count={novCount}
                            intent={hasIncident ? "danger" : "info"}
                          />
                        </button>
                      </td>
                      <td className="flex gap-2">
                        <button className="btn" onClick={() => setSel(s)}>
                          Ver
                        </button>
                        <button
                          className="btn bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => askReset(s)}
                        >
                          Reiniciar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden grid gap-3">
            {schoolsByStation.map((s) => {
              const pct = s.mesasAssigned
                ? Math.round((s.mesasOpen / s.mesasAssigned) * 100)
                : 0;
              const effCount = s.effectives?.length || 0;
              const novCount = s.novedades?.length || 0;
              const hasIncident = (s.novedades || []).some(
                (n) => n.type === "incidente"
              );

              return (
                <div key={s._id} className="card space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {s.station?.name}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        s.isOpen
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {s.isOpen ? "Abierta" : "Cerrada"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      Mesas abiertas {s.mesasOpen}/{s.mesasAssigned || 0} —{" "}
                      {pct}%
                    </div>
                    <Progress value={pct} />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="text-xs text-slate-600">
                      Puertas: {s.doorsClosed ? "✅" : "—"} • Urnas:{" "}
                      {s.urnsRetrieved ? "✅" : "—"} • Def.:{" "}
                      {s.finalClose ? "✅" : "—"}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn px-2 relative"
                        title="Ver efectivos"
                        onClick={() => setEffModal(s)}
                      >
                        👮
                        <Badge count={effCount} />
                      </button>
                      <button
                        className="btn px-2 relative"
                        title="Ver novedades"
                        onClick={() => setNovModal(s)}
                      >
                        🔔
                        <Badge
                          count={novCount}
                          intent={hasIncident ? "danger" : "info"}
                        />
                      </button>
                      <button className="btn" onClick={() => setSel(s)}>
                        Ver
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      className="btn bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => askReset(s)}
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal detalle clásico */}
      <Modal open={!!sel} title={sel?.name || ""} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Comisaría: </span>
                {sel.station?.name || "-"}
              </div>
              <div>
                <span className="text-slate-500">Estado: </span>
                {sel.isOpen ? "Abierta" : "Cerrada"}
              </div>
              <div>
                <span className="text-slate-500">Mesas: </span>
                {sel.mesasOpen}/{sel.mesasAssigned || 0}
              </div>
              <div>
                <span className="text-slate-500">Puertas: </span>
                {sel.doorsClosed ? "Cerradas" : "—"}
              </div>
              <div>
                <span className="text-slate-500">Pend. adentro: </span>
                {sel.pendingVoters || 0}
              </div>
              <div>
                <span className="text-slate-500">Escrutadas: </span>
                {sel.mesasScrutadas || 0}
              </div>
              <div>
                <span className="text-slate-500">Retiro de urnas: </span>
                {sel.urnsRetrieved ? "Sí" : "No"}
              </div>
              <div>
                <span className="text-slate-500">Cierre definitivo: </span>
                {sel.finalClose ? "Sí" : "No"}
              </div>
            </div>

            {/* resumen mini de novedades */}
            <div>
              <div className="font-medium mb-1">Últimas novedades</div>
              <div className="grid gap-2">
                {(sel.novedades || []).slice(0, 3).map((n, i) => (
                  <div key={i} className="p-2 rounded border">
                    <div className="text-[11px] text-slate-500">
                      {new Date(n.at).toLocaleString()} •{" "}
                      {n.type?.toUpperCase()}
                    </div>
                    <div className="truncate">{n.text}</div>
                  </div>
                ))}
                {(!sel.novedades || sel.novedades.length === 0) && (
                  <div className="text-slate-500">Sin novedades</div>
                )}
              </div>
              <div className="mt-2 flex gap-2 justify-end">
                <button className="btn" onClick={() => setEffModal(sel)}>
                  Ver efectivos
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setNovModal(sel);
                    setSel(null);
                  }}
                >
                  Ver novedades
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modales nuevos */}
      <NovedadesModal
        open={!!novModal}
        onClose={() => setNovModal(null)}
        school={novModal}
      />
      <EfectivosModal
        open={!!effModal}
        onClose={() => setEffModal(null)}
        school={effModal}
      />

      {/* Confirm genérico */}
      <Confirm
        open={!!confirm}
        text={confirm?.text}
        onConfirm={doConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
