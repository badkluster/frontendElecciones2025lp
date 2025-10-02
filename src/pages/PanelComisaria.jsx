import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import useSSE from "../hooks/useSSE";
import { useAuthStore } from "../store/auth";

/* ---------- UI helpers ---------- */
function Confirm({ open, onConfirm, onClose, text }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-3">
        <div className="text-lg font-semibold">Confirmar</div>
        <div className="text-sm">{text}</div>
        <div className="flex gap-2 justify-end">
          <button className="btn" onClick={onConfirm}>
            Sí, guardar
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

function Progress({ value = 0 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
    </div>
  );
}

function HourChip({ school, hour, onSet }) {
  const r = school.hourlyReports?.find((x) => x.hour === hour);
  if (r?.locked)
    return (
      <div className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs inline-flex items-center gap-1">
        {hour}hs: <strong>{r?.percent ?? "-"}%</strong>{" "}
        <span aria-label="locked">🔒</span>
      </div>
    );
  return (
    <button
      className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
      onClick={() => {
        const val = window.prompt(`% votantes ${hour}hs`, r?.percent ?? "");
        if (val == null) return;
        const n = Number(val);
        if (isNaN(n) || n < 0 || n > 100)
          return alert("Ingrese un porcentaje 0-100");
        onSet(
          [{ hour, percent: n }],
          `Guardar % ${hour}hs (no se podrá modificar luego)`
        );
      }}
    >
      {hour}hs: Cargar
    </button>
  );
}

/* ---------- Modal Novedades ---------- */
function NovedadModal({ open, onClose, onSave, novedades = [] }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("info");
  useEffect(() => {
    if (!open) {
      setText("");
      setType("info");
    }
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Novedades</h3>
          <button
            className="btn bg-slate-200 text-slate-900 hover:bg-slate-300"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select
              className="input col-span-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="info">Información</option>
              <option value="incidente">Incidente</option>
              <option value="logistica">Logística</option>
            </select>
            <div className="col-span-2 text-right">
              <button
                className="btn"
                onClick={() => {
                  const t = (text || "").trim();
                  if (!t) return;
                  onSave({ type, text: t });
                }}
              >
                Guardar
              </button>
            </div>
          </div>
          <textarea
            className="input w-full h-28"
            placeholder="Escriba una novedad (ej: corte de luz, falta de boletas, refuerzo solicitado, etc.)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div>
          <div className="font-medium mb-1 text-sm">Últimas novedades</div>
          <div className="grid gap-2 max-h-56 overflow-auto">
            {novedades?.length ? (
              novedades.slice(0, 10).map((n, i) => (
                <div key={i} className="p-2 border rounded text-sm">
                  <div className="text-[11px] text-slate-500">
                    {new Date(n.at).toLocaleString()} • {n.type?.toUpperCase()}
                  </div>
                  <div>{n.text}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">
                Sin novedades registradas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers de teléfono/WA ---------- */
const onlyDigits = (s = "") => (s || "").replace(/[^\d]/g, "");
function waLink(phone, defaultMsg) {
  const digits = onlyDigits(phone || "");
  if (!digits) return null;
  const withCC = digits.length <= 12 ? `54${digits}` : digits; // Argentina por defecto
  const msg = encodeURIComponent(defaultMsg || "");
  return `https://wa.me/${withCC}${msg ? `?text=${msg}` : ""}`;
}

/* ---------- Card Escuela ---------- */
function SchoolCard({ s, draft, setDraft, confirmPatch, onOpenNovedad }) {
  const pctOpen = s.mesasAssigned
    ? Math.round((s.mesasOpen / s.mesasAssigned) * 100)
    : 0;

  const inconsistent =
    (s.isOpen && s.mesasOpen === 0) ||
    (!s.isOpen && s.mesasOpen > 0) ||
    (s.effectives?.length || 0) < 2;

  const doneDoors = !!s.doorsClosed;
  const doneUrns = !!s.urnsRetrieved;
  const doneFinal = !!s.finalClose;

  const r18 = s.hourlyReports?.find((x) => x.hour === "18");
  const canAfter18 = !!(r18 && r18.locked && typeof r18.percent === "number");

  const [showEff, setShowEff] = useState(false);

  // helpers seguros cuando draft puede ser null
  const setField = (k, v) => setDraft({ ...(draft || {}), [k]: v });
  const setEffField = (idx, k, v) => {
    const existing = draft?.effectives;
    const eff = existing ? [...existing] : [{}, {}];
    eff[idx] = { ...(eff[idx] || {}), [k]: v };
    setDraft({ ...(draft || {}), effectives: eff });
  };
  const draftOrCurrent = (k, fallback) =>
    draft && draft[k] !== undefined ? draft[k] : fallback;

  const handleSave = () => {
    const body = {
      isOpen: !!draftOrCurrent("isOpen", s.isOpen),
      mesasAssigned:
        Number(draftOrCurrent("mesasAssigned", s.mesasAssigned)) || 0,
      mesasOpen: Number(draftOrCurrent("mesasOpen", s.mesasOpen)) || 0,
      ...(canAfter18
        ? {
            pendingVoters:
              Number(draftOrCurrent("pendingVoters", s.pendingVoters || 0)) ||
              0,
            mesasScrutadas:
              Number(draftOrCurrent("mesasScrutadas", s.mesasScrutadas || 0)) ||
              0,
          }
        : {}),
      effectives: (draft?.effectives || s.effectives || [])
        .slice(0, 2)
        .map((e = {}) => ({
          name: e.name || "",
          phone: e.phone || "",
          rank: e.rank || "",
          legajo: e.legajo || "",
          destino: e.destino || "",
        })),
    };
    confirmPatch(s._id, body, "Confirmar actualización de la escuela?");
  };

  const handleCancel = () => setDraft(null);
  const disabledCls = "opacity-60 cursor-not-allowed";

  const cardClasses = [
    "card space-y-3 border-2 shadow-sm",
    s.isOpen ? "border-green-400" : "border-slate-200",
    inconsistent ? "ring-2 ring-amber-300" : "",
  ].join(" ");

  const StatusChip = ({ ok, text }) => (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {ok ? "✅" : "—"} {text}
    </span>
  );

  const onlyDigits = (s = "") => (s || "").replace(/[^\d]/g, "");
  const waLink = (phone, defaultMsg) => {
    const digits = onlyDigits(phone || "");
    if (!digits) return null;
    const withCC = digits.length <= 12 ? `54${digits}` : digits;
    const msg = encodeURIComponent(defaultMsg || "");
    return `https://wa.me/${withCC}${msg ? `?text=${msg}` : ""}`;
  };

  return (
    <div className={cardClasses}>
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate flex items-center gap-2">
            {s.name}
            {inconsistent && <span className="text-amber-600 text-xs">⚠️</span>}
          </div>
          {s.address && (
            <div className="text-xs text-slate-500 truncate">{s.address}</div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Estado:</span>
              <label className="inline-flex items-center gap-2">
                <div
                  className={`w-12 h-6 rounded-full p-0.5 cursor-pointer ${
                    draftOrCurrent("isOpen", s.isOpen)
                      ? "bg-green-500"
                      : "bg-slate-300"
                  }`}
                  onClick={() =>
                    setField("isOpen", !draftOrCurrent("isOpen", s.isOpen))
                  }
                  title="Abrir/Cerrar escuela"
                >
                  <div
                    className={`h-5 w-5 bg-white rounded-full transition-transform ${
                      draftOrCurrent("isOpen", s.isOpen)
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs ${
                    draftOrCurrent("isOpen", s.isOpen)
                      ? "text-green-700"
                      : "text-slate-700"
                  }`}
                >
                  {draftOrCurrent("isOpen", s.isOpen) ? "Abierta" : "Cerrada"}
                </span>
              </label>
            </div>

            <span className="text-xs text-slate-500">
              Mesas: {draftOrCurrent("mesasOpen", s.mesasOpen)}/
              {draftOrCurrent("mesasAssigned", s.mesasAssigned)} ({pctOpen}%)
            </span>
          </div>
        </div>

        <div className="flex gap-2 items-start">
          <button className="btn" onClick={onOpenNovedad}>
            📝 Novedades {s.novedades?.length ? `(${s.novedades.length})` : ""}
          </button>
        </div>
      </div>

      {/* chips de estados */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip ok={doneDoors} text="Puertas cerradas" />
        <StatusChip ok={doneUrns} text="Urnas retiradas" />
        <StatusChip ok={doneFinal} text="Cierre definitivo" />
      </div>

      {/* progreso */}
      <div className="space-y-1">
        <Progress value={pctOpen} />
        <div className="text-[11px] text-slate-500">
          Porcentaje de mesas abiertas
        </div>
      </div>

      {/* edición */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Mesas Totales</div>
          <input
            className="input w-full"
            type="number"
            min="0"
            value={draftOrCurrent("mesasAssigned", s.mesasAssigned) ?? 0}
            onChange={(e) => setField("mesasAssigned", e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Mesas Abiertas</div>
          <input
            className="input w-full"
            type="number"
            min="0"
            value={draftOrCurrent("mesasOpen", s.mesasOpen) ?? 0}
            onChange={(e) => setField("mesasOpen", e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Pend. adentro</div>
          <input
            className={`input w-full ${!canAfter18 ? disabledCls : ""}`}
            type="number"
            min="0"
            value={draftOrCurrent("pendingVoters", s.pendingVoters || 0)}
            onChange={(e) => setField("pendingVoters", e.target.value)}
            disabled={!canAfter18}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Mesas escrutadas</div>
          <input
            className={`input w-full ${!canAfter18 ? disabledCls : ""}`}
            type="number"
            min="0"
            value={draftOrCurrent("mesasScrutadas", s.mesasScrutadas || 0)}
            onChange={(e) => setField("mesasScrutadas", e.target.value)}
            disabled={!canAfter18}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["14", "15", "16", "17", "18"].map((h) => (
          <HourChip
            key={h}
            school={s}
            hour={h}
            onSet={(hr, txt) => confirmPatch(s._id, { hourlyReports: hr }, txt)}
          />
        ))}
      </div>

      {/* efectivos (colapsable) */}
      <div className="border rounded-lg p-2">
        <button
          className="text-sm font-medium flex items-center justify-between w-full"
          onClick={() => setShowEff((v) => !v)}
        >
          <span>👮 Efectivos (máx. 2)</span>
          <span className="text-xs text-slate-500">
            {showEff ? "Ocultar ▲" : "Ver ◀"}
          </span>
        </button>

        {showEff && (
          <div className="mt-2 grid gap-3">
            {[0, 1].map((i) => {
              const eff = draft?.effectives?.[i] || {};
              const serverEff = s.effectives?.[i] || {};
              const waMsg = `Hola, soy de ${
                s.station?.name || "la comisaría"
              }. Te contacto por ${s.name}.`;
              const link = waLink(eff.phone || serverEff.phone, waMsg);
              return (
                <div key={i} className="rounded border p-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="input"
                      placeholder="Nombre y apellido"
                      value={eff.name ?? serverEff.name ?? ""}
                      onChange={(e) => setEffField(i, "name", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Teléfono"
                      value={eff.phone ?? serverEff.phone ?? ""}
                      onChange={(e) => setEffField(i, "phone", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Jerarquía"
                      value={eff.rank ?? serverEff.rank ?? ""}
                      onChange={(e) => setEffField(i, "rank", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Legajo"
                      value={eff.legajo ?? serverEff.legajo ?? ""}
                      onChange={(e) => setEffField(i, "legajo", e.target.value)}
                    />
                    <input
                      className="input sm:col-span-2"
                      placeholder="Destino"
                      value={eff.destino ?? serverEff.destino ?? ""}
                      onChange={(e) =>
                        setEffField(i, "destino", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-2">
                    <a
                      className={`btn ${
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
            })}
          </div>
        )}
      </div>

      {/* acciones */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button className="btn" onClick={handleSave}>
          Guardar cambios
        </button>

        {!doneDoors && (
          <button
            className={`btn whitespace-nowrap ${
              !canAfter18 ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canAfter18}
            onClick={() =>
              confirmPatch(
                s._id,
                { doorsClosed: true },
                "Confirmar cierre de puertas?"
              )
            }
          >
            Cierre Puertas
          </button>
        )}
        {!doneUrns && (
          <button
            className={`btn bg-slate-200 text-slate-900 hover:bg-slate-300 whitespace-nowrap ${
              !canAfter18 ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canAfter18}
            onClick={() =>
              confirmPatch(
                s._id,
                { urnsRetrieved: true },
                "Confirmar retiro de urnas?"
              )
            }
          >
            Retiro Urnas
          </button>
        )}
        {!doneFinal && (
          <button
            className={`btn bg-slate-200 text-slate-900 hover:bg-slate-300 whitespace-nowrap ${
              !canAfter18 ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canAfter18}
            onClick={() =>
              confirmPatch(
                s._id,
                { finalClose: true },
                "Confirmar cierre definitivo?"
              )
            }
          >
            Cierre Definitivo
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Página ---------- */
export default function PanelComisaria() {
  const [schools, setSchools] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [novModal, setNovModal] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState({});
  const logout = useAuthStore((s) => s.logout);

  async function load() {
    const { data } = await api.get("/schools");
    setSchools(data);
  }
  useEffect(() => {
    load();
  }, []);
  useSSE(() => load());

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of schools) {
        if (!next[s._id] || next[s._id] === null) {
          next[s._id] = {
            isOpen: s.isOpen,
            mesasAssigned: s.mesasAssigned || 0,
            mesasOpen: s.mesasOpen || 0,
            pendingVoters: s.pendingVoters || 0,
            mesasScrutadas: s.mesasScrutadas || 0,
            effectives: (s.effectives || []).slice(0, 2).map((e) => ({
              name: e?.name || "",
              phone: e?.phone || "",
              rank: e?.rank || "",
              legajo: e?.legajo || "",
              destino: e?.destino || "",
            })),
          };
        }
      }
      return next;
    });
  }, [schools]);

  function setDraftFor(id, val) {
    setDrafts((d) => ({ ...d, [id]: val === null ? null : { ...val } }));
  }

  function confirmPatch(id, body, text) {
    setConfirm({ id, body, text });
  }
  async function doConfirm() {
    try {
      const { id, body } = confirm;
      await api.patch(`/schools/${id}`, body);
      setConfirm(null);
      setDraftFor(id, null);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  const stationName = useMemo(() => {
    const n = schools?.[0]?.station?.name || "Comisaría";
    return `Panel ${n.toUpperCase()}`;
  }, [schools]);

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools]
  );
  const filtered = useMemo(
    () =>
      selectedId
        ? sortedSchools.filter((s) => s._id === selectedId)
        : sortedSchools,
    [sortedSchools, selectedId]
  );

  return (
    <div className="max-w-3xl mx-auto p-3 space-y-4">
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur p-2 -mx-3 border-b">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold">{stationName}</h1>
          <div className="flex gap-2 items-center">
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Todas las escuelas</option>
              {sortedSchools.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="btn" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((s) => (
          <SchoolCard
            key={s._id}
            s={s}
            draft={drafts[s._id]}
            setDraft={(val) => setDraftFor(s._id, val)}
            confirmPatch={confirmPatch}
            onOpenNovedad={() => setNovModal({ school: s })}
          />
        ))}
      </div>

      <NovedadModal
        open={!!novModal}
        onClose={() => setNovModal(null)}
        novedades={novModal?.school?.novedades || []}
        onSave={async ({ type, text }) => {
          try {
            await api.post(`/schools/${novModal.school._id}/novelties`, {
              type,
              text,
            });
            setNovModal(null);
            load();
          } catch (e) {
            alert(e?.response?.data?.error || e.message);
          }
        }}
      />

      <Confirm
        open={!!confirm}
        text={confirm?.text}
        onConfirm={doConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
