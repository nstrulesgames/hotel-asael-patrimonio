"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Floor = { id: number; name: string; position: number; active: number };
type Room = { id: number; floor_id: number; number: string; type: string; capacity: number; status: string; notes: string; active: number; stay_id?: number; stay_type?: string; stay_notes?: string; check_in?: string; expected_check_out?: string; guest_id?: number; guest_name?: string; guest_ci?: string; guest_phone?: string; guest_count?: number; current_segment_id?: number; turnover_id?: number; turnover_status?: "PENDIENTE" | "EN_LIMPIEZA" | "PENDIENTE_INSPECCION" | "OBSERVADO" | "COMPLETADO"; cleaning_started_at?: string; cleaning_started_by?: string; cleaning_completed_at?: string; cleaning_completed_by?: string };
type HotelEvent = { id: number; room_id: number; room_number: string; type: string; title: string; detail: string; status: string; created_by: string; created_at: string };
type InventoryItem = { id: number; room_id: number; name: string; quantity: number; notes: string };
type InspectionKind = "ENTREGA" | "DEVOLUCION" | "LIMPIEZA_FINAL";
type Inspection = { id: number; stay_id: number; room_id: number; segment_id?: number; kind: InspectionKind; notes: string; created_by: string; created_at: string };
type InspectionItem = { id: number; inspection_id: number; inventory_item_id?: number; name: string; quantity: number; condition: "BUENO" | "OBSERVADO" | "FALTANTE"; notes: string };
type Worker = { id: number; name: string; email: string; role: string; active: number; created_at: string };
type HotelDocument = { id: number; room_id: number; stay_id?: number; segment_id?: number; work_order_id?: number; phase: "GENERAL" | "ENTREGA" | "DEVOLUCION"; category: string; filename: string; content_type: string; uploaded_by: string; created_at: string };
type StaySegment = { id: number; stay_id: number; room_id: number; room_number: string; sequence: number; started_at: string; ended_at?: string; start_reason: string; end_reason?: string; created_by: string; ended_by?: string; document_count: number; delivery_count: number; return_count: number; delivery_signed: number; return_signed: number };
type OperationalAlert = { type: "ACTA_ENTREGA_VENCIDA" | "CIERRE_OPERATIVO" | "ESTADIA_VENCIDA" | "TAREA_VENCIDA" | "TAREA_POR_VENCER"; room_id: number; room_number: string; stay_id?: number; work_order_id?: number; created_at: string; days_overdue: number };
type WorkOrder = { id: number; room_id: number; room_number: string; stay_id?: number; segment_id?: number; type: string; title: string; detail: string; priority: "BAJA" | "MEDIA" | "ALTA" | "URGENTE"; status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"; assigned_user_id?: number; assigned_name?: string; assigned_active?: number; due_at?: string; blocks_room: number; created_by: string; created_at: string; started_at?: string; completed_at?: string; cancelled_at?: string; cancellation_reason?: string; before_count: number; after_count: number };
type WorkOrderHistory = { id: number; work_order_id: number; action: string; from_status?: string; to_status?: string; detail: string; performed_by: string; created_at: string };
type ChangeRequest = { id: number; room_id: number; room_number: string; entity_type: "GUEST" | "STAY"; entity_id: number; field_name: string; old_value?: string; proposed_value?: string; reason: string; status: "PENDIENTE" | "APROBADA" | "RECHAZADA"; application_mode: "DIRECTA" | "APROBACION"; requested_by_user_id: number; requested_by_name: string; requested_at: string; reviewed_by_name?: string; reviewed_at?: string; review_note?: string; applied_at?: string };
type Data = { user: { id: number; name: string; email: string; role: string }; floors: Floor[]; rooms: Room[]; events: HotelEvent[]; inventory: InventoryItem[]; inspections: Inspection[]; inspectionItems: InspectionItem[]; users: Worker[]; documents: HotelDocument[]; alerts: OperationalAlert[]; segments: StaySegment[]; workOrders: WorkOrder[]; workOrderHistory: WorkOrderHistory[]; changeRequests: ChangeRequest[] };
type Companion = { fullName: string; ci: string; phone: string; isMinor: boolean };

const labels: Record<string, string> = {
  DISPONIBLE: "Disponible", OCUPADA: "Ocupada", LIMPIEZA: "En limpieza", MANTENIMIENTO: "Mantenimiento", FUERA_SERVICIO: "Fuera de servicio",
  DIA: "Por día", SEMANA: "Por semana", MES: "Por mes", ARRENDAMIENTO: "Arrendamiento",
  PROPIETARIO: "Propietario", ADMINISTRADOR: "Administrador", RECEPCION: "Recepción",
  PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", COMPLETADO: "Completado", CANCELADO: "Cancelado",
  BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente", REPARACION: "Reparación", DANO: "Daño", MUEBLES: "Muebles",
};

const statusOrder = ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"];
const evidenceLabels: Record<string, string> = { VISTA_GENERAL: "Vista general", CAMA: "Cama y ropa de cama", MUEBLES: "Muebles", BANO: "Baño", TELEVISION: "Televisión", VENTILADOR: "Ventilador", DANOS: "Daños u observaciones", OTRA_EVIDENCIA: "Otra evidencia", CONTRATO: "Contrato", ACTA_ENTREGA_FIRMADA: "Acta de entrega firmada", ACTA_DEVOLUCION_FIRMADA: "Acta de devolución firmada" };

export default function HotelDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | "all">("all");
  const [selected, setSelected] = useState<Room | null>(null);
  const [modal, setModal] = useState<"room" | "checkin" | "event" | "transfer" | "edit" | "inventory" | "inspection" | "print" | "correction" | null>(null);
  const [inspectionKind, setInspectionKind] = useState<InspectionKind>("ENTREGA");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [view, setView] = useState<"habitaciones" | "tareas" | "aprobaciones" | "actividad" | "configuracion">("habitaciones");
  const [taskRoomId, setTaskRoomId] = useState<number | undefined>();

  const load = useCallback(async () => {
    const response = await fetch("/api/hotel", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo cargar el hotel");
    setData(result);
    setSelected((current) => current ? result.rooms.find((room: Room) => room.id === current.id) || null : null);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/hotel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo completar la operación");
      await load();
      setModal(null);
      setNotice(result.pending ? "Solicitud enviada. El valor original seguirá vigente hasta la aprobación." : result.direct ? "Corrección aplicada y registrada en el historial." : "Cambios guardados correctamente.");
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ocurrió un error");
      return null;
    } finally { setBusy(false); }
  };

  const operationalRooms = useMemo(() => data?.rooms.filter((room) => Boolean(room.active)) || [], [data]);
  const visibleRooms = useMemo(() => operationalRooms.filter((room) => activeFloor === "all" || room.floor_id === activeFloor), [operationalRooms, activeFloor]);
  const counts = useMemo(() => Object.fromEntries(statusOrder.map((status) => [status, operationalRooms.filter((room) => room.status === status).length])), [operationalRooms]);
  const pendingApprovals = data.changeRequests.filter((request) => request.status === "PENDIENTE").length;

  const openRoom = (room: Room) => { setSelected(room); setModal("room"); };

  if (!data && notice) return <div className="access-blocked"><span className="brand-mark">A</span><h1>Acceso no disponible</h1><p>{notice}</p><a href="/signout-with-chatgpt?return_to=/">Usar otro correo</a></div>;
  if (!data) return <div className="loading"><span className="brand-mark">A</span><p>Preparando Hotel ASAEL…</p></div>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A</span><div><b>ASAEL</b><small>Gestión hotelera</small></div></div>
        <nav>
          <button className={view === "habitaciones" ? "active" : ""} onClick={() => setView("habitaciones")}><span>▦</span> Habitaciones</button>
          <button className={view === "tareas" ? "active" : ""} onClick={() => { setTaskRoomId(undefined); setView("tareas"); }}><span>✓</span> Tareas</button>
          <button className={view === "aprobaciones" ? "active" : ""} onClick={() => setView("aprobaciones")}><span>◇</span> Aprobaciones{pendingApprovals > 0 && <em className="nav-badge">{pendingApprovals}</em>}</button>
          <button className={view === "actividad" ? "active" : ""} onClick={() => setView("actividad")}><span>◷</span> Actividad</button>
          <button className={view === "configuracion" ? "active" : ""} onClick={() => setView("configuracion")}><span>⚙</span> Configuración</button>
        </nav>
        <div className="sidebar-note"><strong>Operación interna</strong><p>Las actas se imprimen, firman en papel y luego se respaldan aquí.</p></div>
        <div className="user-card"><span>{data.user.name.slice(0, 1).toUpperCase()}</span><div><b>{data.user.name}</b><small>{labels[data.user.role] || data.user.role}</small></div></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Hotel ASAEL · {new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p><h1>{view === "habitaciones" ? "Estado del hotel" : view === "tareas" ? "Tareas operativas" : view === "aprobaciones" ? "Correcciones y aprobaciones" : view === "actividad" ? "Bitácora operativa" : "Configuración del hotel"}</h1></div>
          <button className="primary" onClick={() => { if (view === "tareas") { document.getElementById("new-work-order")?.scrollIntoView({ behavior: "smooth" }); return; } const room = data.rooms.find((item) => item.status === "DISPONIBLE"); if (room) { setSelected(room); setCompanions([]); setModal("checkin"); } else setNotice("No hay habitaciones disponibles."); }}>{view === "tareas" ? "＋ Nueva tarea" : "＋ Registrar ingreso"}</button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {view === "habitaciones" && (data.alerts.length > 0 || pendingApprovals > 0) && <OperationalAlerts alerts={data.alerts} pendingApprovals={pendingApprovals} onOpenRoom={(id) => { const room = data.rooms.find((item) => item.id === id); if (room) openRoom(room); }} onOpenTasks={() => setView("tareas")} onOpenApprovals={() => setView("aprobaciones")} />}

        {view === "habitaciones" && <>
          <section className="summary-grid">
            <article className="summary hero-summary"><span className="summary-icon">⌂</span><div><small>Ocupación actual</small><strong>{counts.OCUPADA}<em> / {operationalRooms.length}</em></strong><p>{operationalRooms.length ? Math.round((counts.OCUPADA / operationalRooms.length) * 100) : 0}% de las habitaciones</p></div></article>
            {statusOrder.slice(0, 4).map((status) => <article className={`summary tone-${status.toLowerCase()}`} key={status}><small>{labels[status]}</small><strong>{counts[status]}</strong><i /></article>)}
          </section>

          <section className="panel room-panel">
            <div className="panel-head"><div><h2>Habitaciones</h2><p>Selecciona una habitación para ver su estadía y realizar acciones.</p></div><div className="floor-tabs"><button className={activeFloor === "all" ? "active" : ""} onClick={() => setActiveFloor("all")}>Todas</button>{data.floors.filter((floor) => Boolean(floor.active)).map((floor) => <button key={floor.id} className={activeFloor === floor.id ? "active" : ""} onClick={() => setActiveFloor(floor.id)}>{floor.name}</button>)}</div></div>
            <div className="room-grid">{visibleRooms.map((room) => <button key={room.id} className={`room-card status-${room.status.toLowerCase()}`} onClick={() => openRoom(room)}>
              <div className="room-top"><span className="room-number">{room.number}</span><span className="status-pill"><i />{labels[room.status]}</span></div>
              <div className="room-main">{room.guest_name ? <><strong>{room.guest_name}</strong><p>{labels[room.stay_type || ""]} · {room.guest_count || 1} {(room.guest_count || 1) === 1 ? "huésped" : "huéspedes"}</p></> : <><strong>{room.type}</strong><p>Capacidad: {room.capacity} personas</p></>}</div>
              <div className="room-foot"><span>{data.floors.find((floor) => floor.id === room.floor_id)?.name}</span><span>Ver detalle →</span></div>
            </button>)}</div>
          </section>

          <section className="panel recent"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados por el personal.</p></div><button className="text-button" onClick={() => setView("actividad")}>Ver toda la actividad</button></div><EventList events={data.events.slice(0, 5)} /></section>
        </>}

        {view === "actividad" && <section className="panel activity-page"><div className="panel-head"><div><h2>Bitácora de habitaciones</h2><p>Ingresos, salidas, limpieza, mantenimiento y cambios de habitación.</p></div></div><EventList events={data.events} /></section>}

        {view === "tareas" && <WorkOrdersView data={data} busy={busy} preferredRoomId={taskRoomId} onReload={load} onAction={action} onNotice={setNotice} />}

        {view === "aprobaciones" && <ApprovalsView data={data} busy={busy} onAction={action} />}

        {view === "configuracion" && <ConfigurationView data={data} busy={busy} onAction={action} />}
      </section>

      {modal && selected && <Modal onClose={() => setModal(null)} wide={modal === "room" || modal === "print"}>
        {modal === "room" && <RoomDetail room={selected} data={data} onReload={load} onAction={(next) => setModal(next)} onOpenTasks={() => { setTaskRoomId(selected.id); setView("tareas"); setModal(null); }} onInspection={(kind) => { setInspectionKind(kind); setModal("inspection"); }} onPrint={(kind) => { setInspectionKind(kind); setModal("print"); }} onCheckout={() => action({ action: "checkout", roomId: selected.id })} onWorkflow={(workflowAction) => action({ action: workflowAction, roomId: selected.id, turnoverId: selected.turnover_id })} busy={busy} />}
        {modal === "checkin" && <CheckIn room={selected} userRole={data.user.role} companions={companions} setCompanions={setCompanions} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "checkin", roomId: selected.id, ...payload }); if (result) setCompanions([]); }} />}
        {modal === "event" && <EventForm room={selected} busy={busy} onSubmit={(payload) => action({ action: "event", roomId: selected.id, stayId: selected.stay_id, ...payload })} />}
        {modal === "transfer" && <Transfer room={selected} rooms={data.rooms} userRole={data.user.role} busy={busy} onSubmit={(payload) => action({ action: "transfer", roomId: selected.id, ...payload })} />}
        {modal === "edit" && <EditRoom room={selected} busy={busy} onSubmit={(payload) => action({ action: "room", roomId: selected.id, ...payload })} />}
        {modal === "inventory" && <InventoryEditor room={selected} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSave={(payload) => action({ action: "inventory", roomId: selected.id, ...payload })} onDelete={(itemId) => action({ action: "inventory_delete", roomId: selected.id, itemId })} />}
        {modal === "correction" && <CorrectionForm room={selected} data={data} busy={busy} onSubmit={(payload) => action({ action: "correction_submit", roomId: selected.id, ...payload })} />}
        {modal === "inspection" && <InspectionForm room={selected} kind={inspectionKind} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "inspection", roomId: selected.id, stayId: selected.stay_id, kind: inspectionKind, ...payload }); if (result && inspectionKind !== "LIMPIEZA_FINAL") { setInspectionKind(inspectionKind); setModal("print"); } }} />}
        {modal === "print" && inspectionKind !== "LIMPIEZA_FINAL" && <DeliveryAct room={selected} kind={inspectionKind} inspection={data.inspections.find((item) => item.segment_id === selected.current_segment_id && item.kind === inspectionKind)} items={data.inspectionItems} fallbackItems={data.inventory.filter((item) => item.room_id === selected.id)} onPrint={() => window.print()} />}
      </Modal>}
    </main>
  );
}

function OperationalAlerts({ alerts, pendingApprovals, onOpenRoom, onOpenTasks, onOpenApprovals }: { alerts: OperationalAlert[]; pendingApprovals: number; onOpenRoom: (id: number) => void; onOpenTasks: () => void; onOpenApprovals: () => void }) {
  const info: Record<string, { icon: string; text: (alert: OperationalAlert) => string; task?: boolean }> = {
    ACTA_ENTREGA_VENCIDA: { icon: "!", text: (alert) => "Acta firmada sin cargar · " + Math.max(1, alert.days_overdue) + " día(s)" },
    CIERRE_OPERATIVO: { icon: "↻", text: () => "Cierre de limpieza pendiente" },
    ESTADIA_VENCIDA: { icon: "⌛", text: (alert) => "Estadía vencida · " + Math.max(1, alert.days_overdue) + " día(s) de retraso" },
    TAREA_VENCIDA: { icon: "!", text: (alert) => "Tarea vencida · " + Math.max(1, alert.days_overdue) + " día(s)", task: true },
    TAREA_POR_VENCER: { icon: "◷", text: () => "Tarea vence durante las próximas 24 horas", task: true },
  };
  return <section className="ops-alerts" aria-label="Alertas operativas">{pendingApprovals > 0 && <button className="approval-alert" onClick={onOpenApprovals}><span>◇</span><div><b>{pendingApprovals} solicitud(es) pendiente(s)</b><small>Administración debe aprobar o rechazar</small></div></button>}{alerts.slice(0, 7).map((alert, index) => { const item = info[alert.type]; return <button key={alert.type + "-" + alert.room_id + "-" + index} onClick={item.task ? onOpenTasks : () => onOpenRoom(alert.room_id)}><span>{item.icon}</span><div><b>Habitación {alert.room_number}</b><small>{item.text(alert)}</small></div></button>; })}</section>;
}

const correctionFieldLabels: Record<string, string> = { full_name: "Nombre del huésped", ci: "CI del huésped", phone: "Celular / WhatsApp", expected_check_out: "Fecha prevista de salida", stay_type: "Modalidad de estadía", notes: "Observaciones de estadía" };

function CorrectionForm({ room, data, busy, onSubmit }: { room: Room; data: Data; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [fieldName, setFieldName] = useState("full_name");
  const currentValue = (field: string) => field === "full_name" ? room.guest_name || "" : field === "ci" ? room.guest_ci || "" : field === "phone" ? room.guest_phone || "" : field === "expected_check_out" ? room.expected_check_out?.slice(0, 10) || "" : field === "stay_type" ? room.stay_type || "DIA" : room.stay_notes || "";
  const [proposedValue, setProposedValue] = useState(currentValue("full_name"));
  const actGenerated = data.inspections.some((inspection) => inspection.segment_id === room.current_segment_id && (inspection.kind === "ENTREGA" || inspection.kind === "DEVOLUCION"));
  const [referenceTime] = useState(() => Date.now());
  const withinWindow = Boolean(room.check_in && referenceTime - new Date(room.check_in).getTime() <= 30 * 60 * 1000);
  const direct = data.user.role !== "RECEPCION" || (withinWindow && !actGenerated);
  const pending = data.changeRequests.find((request) => request.room_id === room.id && request.field_name === fieldName && request.status === "PENDIENTE");
  const changeField = (next: string) => { setFieldName(next); setProposedValue(currentValue(next)); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); onSubmit({ fieldName, proposedValue, reason: values.get("reason") }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Habitación {room.number}</p><h2>Corregir datos de la estadía</h2><p>El sistema decidirá si el cambio puede aplicarse directamente o debe esperar aprobación administrativa.</p></div><div className={"approval-rule " + (direct ? "direct" : "pending")}><b>{direct ? "Corrección directa disponible" : "Se creará una solicitud pendiente"}</b><span>{direct ? data.user.role === "RECEPCION" ? "Aún estás dentro de los primeros 30 minutos y no existe un acta." : "Tu rol administrativo permite aplicar y auditar el cambio." : "Pasaron 30 minutos o ya existe un acta; el dato original seguirá vigente."}</span></div><div className="form-grid one"><label>Dato a corregir<select value={fieldName} onChange={(event) => changeField(event.target.value)}><option value="full_name">Nombre del huésped</option><option value="ci">CI del huésped</option><option value="phone">Celular / WhatsApp</option><option value="expected_check_out">Fecha prevista de salida</option><option value="stay_type">Modalidad de estadía</option><option value="notes">Observaciones de estadía</option></select></label><label>Valor actual<input value={currentValue(fieldName)} disabled /></label>{fieldName === "stay_type" ? <label>Nuevo valor<select value={proposedValue} onChange={(event) => setProposedValue(event.target.value)}><option value="DIA">Por día</option><option value="SEMANA">Por semana</option><option value="MES">Por mes</option><option value="ARRENDAMIENTO">Arrendamiento</option></select></label> : fieldName === "notes" ? <label>Nuevo valor<textarea value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} /></label> : <label>Nuevo valor<input type={fieldName === "expected_check_out" ? "date" : "text"} value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} required={fieldName === "full_name" || fieldName === "ci"} /></label>}<label>Motivo obligatorio<textarea name="reason" required placeholder="Explica por qué debe corregirse este dato…" /></label></div>{pending && <div className="pending-existing">Ya existe una solicitud pendiente para este dato, enviada por {pending.requested_by_name}.</div>}<div className="form-actions"><span>Se conservarán el valor anterior, el propuesto, usuarios y fechas.</span><button className="primary" disabled={busy || Boolean(pending) || proposedValue === currentValue(fieldName)}>{busy ? "Guardando…" : direct ? "Aplicar corrección" : "Enviar solicitud"}</button></div></form>;
}

function ApprovalsView({ data, busy, onAction }: { data: Data; busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [filter, setFilter] = useState("PENDIENTE");
  const canReview = data.user.role !== "RECEPCION";
  const requests = data.changeRequests.filter((request) => filter === "TODAS" || request.status === filter);
  const readable = (request: ChangeRequest, value?: string) => request.field_name === "stay_type" ? labels[value || ""] || value || "Vacío" : value || "Vacío";
  const review = (request: ChangeRequest, decision: "APROBADA" | "RECHAZADA") => {
    const note = decision === "RECHAZADA" ? window.prompt("Motivo obligatorio del rechazo:") : window.prompt("Nota de aprobación (opcional):") || "";
    if (decision === "RECHAZADA" && !note) return;
    onAction({ action: "correction_review", requestId: request.id, decision, reviewNote: note });
  };
  return <section className="approvals-page"><article className="panel approval-summary"><div><p className="eyebrow">Control administrativo</p><h2>{data.changeRequests.filter((request) => request.status === "PENDIENTE").length} solicitudes pendientes</h2><p>{canReview ? "Revisa el valor original, el cambio propuesto y su motivo antes de decidir." : "Aquí puedes seguir las correcciones que enviaste y su resolución."}</p></div><div className="approval-counts"><span><b>{data.changeRequests.filter((request) => request.status === "APROBADA").length}</b>Aprobadas</span><span><b>{data.changeRequests.filter((request) => request.status === "RECHAZADA").length}</b>Rechazadas</span></div></article><div className="task-filter"><button className={filter === "PENDIENTE" ? "active" : ""} onClick={() => setFilter("PENDIENTE")}>Pendientes</button><button className={filter === "APROBADA" ? "active" : ""} onClick={() => setFilter("APROBADA")}>Aprobadas</button><button className={filter === "RECHAZADA" ? "active" : ""} onClick={() => setFilter("RECHAZADA")}>Rechazadas</button><button className={filter === "TODAS" ? "active" : ""} onClick={() => setFilter("TODAS")}>Todas</button></div><div className="approval-list">{requests.length ? requests.map((request) => <article className={"panel approval-card status-" + request.status.toLowerCase()} key={request.id}><header><div><span>Habitación {request.room_number}</span><b>{correctionFieldLabels[request.field_name] || request.field_name}</b></div><em>{labels[request.status] || request.status}</em></header><div className="value-change"><div><small>Valor vigente</small><strong>{readable(request, request.old_value)}</strong></div><i>→</i><div><small>Valor propuesto</small><strong>{readable(request, request.proposed_value)}</strong></div></div><p className="request-reason"><b>Motivo:</b> {request.reason}</p><footer><span>Solicitado por <b>{request.requested_by_name}</b> · {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.requested_at))}</span>{request.reviewed_by_name && <span>Resuelto por <b>{request.reviewed_by_name}</b>{request.review_note ? " · " + request.review_note : ""}</span>}{request.status === "PENDIENTE" && canReview && <div><button className="danger-light" disabled={busy} onClick={() => review(request, "RECHAZADA")}>Rechazar</button><button className="primary" disabled={busy} onClick={() => review(request, "APROBADA")}>Aprobar y aplicar</button></div>}</footer></article>) : <article className="panel empty-tasks"><strong>No hay solicitudes en esta vista.</strong><p>Las correcciones auditadas aparecerán aquí.</p></article>}</div></section>;
}

function WorkOrdersView({ data, busy, preferredRoomId, onReload, onAction, onNotice }: { data: Data; busy: boolean; preferredRoomId?: number; onReload: () => Promise<void>; onAction: (payload: Record<string, unknown>) => Promise<unknown>; onNotice: (message: string) => void }) {
  const [roomId, setRoomId] = useState(String(preferredRoomId || ""));
  const [filter, setFilter] = useState("ABIERTAS");
  const activeUsers = data.users.filter((worker) => Boolean(worker.active));
  const openCount = data.workOrders.filter((order) => order.status === "PENDIENTE" || order.status === "EN_PROCESO").length;
  const visible = data.workOrders.filter((order) => filter === "TODAS" || (filter === "ABIERTAS" ? order.status === "PENDIENTE" || order.status === "EN_PROCESO" : order.status === filter));
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const result = await onAction({ action: "work_order_create", roomId: values.get("roomId"), type: values.get("type"), title: values.get("title"), detail: values.get("detail"), priority: values.get("priority"), assignedUserId: values.get("assignedUserId"), dueAt: values.get("dueAt") || null, blocksRoom: values.get("blocksRoom") === "on" });
    if (result) { form.reset(); setRoomId(""); }
  };
  return <section className="work-orders-page">
    <article className="panel work-order-create" id="new-work-order">
      <div className="panel-head"><div><h2>Nueva tarea operativa</h2><p>Registra limpieza extraordinaria, reparación, daño, mantenimiento o movimiento de muebles.</p></div><strong className="open-counter">{openCount} abiertas</strong></div>
      <form onSubmit={create} className="work-order-form">
        <label>Habitación<select name="roomId" required value={roomId} onChange={(event) => setRoomId(event.target.value)}><option value="">Seleccionar</option>{data.rooms.filter((room) => Boolean(room.active)).map((room) => <option key={room.id} value={room.id}>Habitación {room.number} · {labels[room.status]}</option>)}</select></label>
        <label>Tipo<select name="type"><option value="MANTENIMIENTO">Mantenimiento</option><option value="REPARACION">Reparación</option><option value="DANO">Daño</option><option value="LIMPIEZA">Limpieza extraordinaria</option><option value="MUEBLES">Movimiento de muebles</option><option value="OTRO">Otro</option></select></label>
        <label>Prioridad<select name="priority"><option value="MEDIA">Media</option><option value="BAJA">Baja</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label>
        <label>Responsable<select name="assignedUserId"><option value="">Sin asignar</option>{activeUsers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
        <label className="span-2">Trabajo a realizar<input name="title" required placeholder="Ej. Reparar fuga en la ducha" /></label>
        <label>Fecha límite<input name="dueAt" type="datetime-local" /></label>
        <label className="block-check"><input name="blocksRoom" type="checkbox" /> Bloquea el uso de la habitación</label>
        <label className="span-2">Detalle<textarea name="detail" placeholder="Describe el problema, ubicación y resultado esperado…" /></label>
        <button className="primary span-2" disabled={busy}>Crear tarea</button>
      </form>
    </article>
    <div className="task-filter"><button className={filter === "ABIERTAS" ? "active" : ""} onClick={() => setFilter("ABIERTAS")}>Abiertas</button><button className={filter === "PENDIENTE" ? "active" : ""} onClick={() => setFilter("PENDIENTE")}>Pendientes</button><button className={filter === "EN_PROCESO" ? "active" : ""} onClick={() => setFilter("EN_PROCESO")}>En proceso</button><button className={filter === "COMPLETADO" ? "active" : ""} onClick={() => setFilter("COMPLETADO")}>Completadas</button><button className={filter === "TODAS" ? "active" : ""} onClick={() => setFilter("TODAS")}>Todas</button></div>
    <div className="work-order-list">{visible.length ? visible.map((order) => <WorkOrderCard key={order.id} order={order} data={data} busy={busy} onAction={onAction} onReload={onReload} onNotice={onNotice} />) : <article className="panel empty-tasks"><strong>No hay tareas en esta vista.</strong><p>Las nuevas órdenes aparecerán aquí con su responsable y seguimiento.</p></article>}</div>
  </section>;
}

function WorkOrderCard({ order, data, busy, onAction, onReload, onNotice }: { order: WorkOrder; data: Data; busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown>; onReload: () => Promise<void>; onNotice: (message: string) => void }) {
  const canConfigure = data.user.role === "PROPIETARIO" || data.user.role === "ADMINISTRADOR";
  const isOpen = order.status === "PENDIENTE" || order.status === "EN_PROCESO";
  const history = data.workOrderHistory.filter((item) => item.work_order_id === order.id);
  const documents = data.documents.filter((item) => item.work_order_id === order.id);
  const update = (status: string) => {
    const reason = status === "CANCELADO" ? window.prompt("Motivo de cancelación:") : "";
    if (status === "CANCELADO" && !reason) return;
    onAction({ action: "work_order_update", workOrderId: order.id, status, reason });
  };
  return <article className={"panel work-order-card priority-" + order.priority.toLowerCase()}>
    <header><div><span className="task-room">Habitación {order.room_number}</span><span className={"task-priority " + order.priority.toLowerCase()}>{labels[order.priority]}</span>{Boolean(order.blocks_room) && <span className="blocking-badge">Bloqueante</span>}</div><span className={"task-status status-" + order.status.toLowerCase()}>{labels[order.status]}</span></header>
    <div className="task-content"><div className="task-main"><small>{labels[order.type] || order.type}</small><h3>{order.title}</h3><p>{order.detail || "Sin detalle adicional."}</p><div className="task-meta"><span>Responsable: <b>{order.assigned_name || "Sin asignar"}</b>{order.assigned_name && !order.assigned_active ? " · acceso inactivo" : ""}</span><span>Creada por {order.created_by}</span>{order.due_at && <span className={isOpen && new Date(order.due_at) < new Date() ? "overdue" : ""}>Límite: {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.due_at))}</span>}</div></div>
      <aside className="task-controls">{isOpen && canConfigure && <select aria-label="Reasignar responsable" value={order.assigned_user_id || ""} onChange={(event) => onAction({ action: "work_order_assign", workOrderId: order.id, assignedUserId: event.target.value })}><option value="">Sin asignar</option>{data.users.filter((worker) => Boolean(worker.active)).map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select>}{order.status === "PENDIENTE" && <button className="primary" disabled={busy} onClick={() => update("EN_PROCESO")}>Iniciar tarea</button>}{order.status === "EN_PROCESO" && <button className="primary" disabled={busy} onClick={() => update("COMPLETADO")}>Marcar completada</button>}{isOpen && canConfigure && <button className="danger-light" disabled={busy} onClick={() => update("CANCELADO")}>Cancelar</button>}</aside>
    </div>
    <TaskEvidence order={order} documents={documents} onReload={onReload} onNotice={onNotice} />
    <details className="task-history"><summary>Historial ({history.length})</summary>{history.map((item) => <div key={item.id}><i /><span><b>{item.performed_by}</b> · {item.to_status ? labels[item.to_status] || item.to_status : item.action}<small>{new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}{item.detail ? " · " + item.detail : ""}</small></span></div>)}</details>
  </article>;
}

function TaskEvidence({ order, documents, onReload, onNotice }: { order: WorkOrder; documents: HotelDocument[]; onReload: () => Promise<void>; onNotice: (message: string) => void }) {
  const [category, setCategory] = useState("TRABAJO_ANTES");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file); form.set("roomId", String(order.room_id)); form.set("workOrderId", String(order.id)); form.set("category", category); form.set("phase", "GENERAL");
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setFile(null); await onReload(); onNotice("Evidencia de la tarea guardada.");
    } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo guardar la evidencia."); } finally { setUploading(false); }
  };
  return <section className="task-evidence"><div className="evidence-heading"><div><b>Evidencias antes y después</b><small>{order.before_count} antes · {order.after_count} después</small></div></div><div className="upload-row"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="TRABAJO_ANTES">Antes del trabajo</option><option value="TRABAJO_DESPUES">Después del trabajo</option></select><label className="file-picker">{file ? file.name : "Tomar foto o elegir archivo"}<input type="file" accept="image/*,.pdf" capture="environment" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button disabled={!file || uploading} onClick={upload}>{uploading ? "Subiendo…" : "Guardar"}</button></div>{documents.length > 0 && <div className="task-documents">{documents.map((document) => <a key={document.id} href={"/api/documents?id=" + document.id} target="_blank" rel="noreferrer">{document.category === "TRABAJO_ANTES" ? "Antes" : "Después"} · {document.filename}</a>)}</div>}</section>;
}

function ConfigurationView({ data, busy, onAction }: { data: Data; busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const canEdit = data.user.role !== "RECEPCION";
  const [inventoryMode, setInventoryMode] = useState("BASE");
  const activeFloors = data.floors.filter((floor) => Boolean(floor.active));
  const createFloor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const result = await onAction({ action: "floor_create", name: values.get("name"), position: values.get("position") });
    if (result) form.reset();
  };
  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const result = await onAction({ action: "room_create", number: values.get("number"), floorId: values.get("floorId"), type: values.get("type"), capacity: values.get("capacity"), notes: values.get("notes"), inventoryMode, sourceRoomId: values.get("sourceRoomId") });
    if (result) { form.reset(); setInventoryMode("BASE"); }
  };
  return <section className="configuration-page">
    <article className="panel structure-card">
      <div className="panel-head"><div><h2>Estructura del hotel</h2><p>{activeFloors.length} pisos activos · {data.rooms.filter((room) => Boolean(room.active)).length} habitaciones activas. Los registros inactivos conservan su historial.</p></div></div>
      {canEdit && <div className="structure-create-grid">
        <form className="config-form" onSubmit={createFloor}><h3>Crear piso</h3><label>Nombre<input name="name" placeholder="Ej. Piso 4 o Terraza" required /></label><label>Orden<input name="position" type="number" min="1" placeholder="Automático" /></label><button className="primary" disabled={busy}>Añadir piso</button></form>
        <form className="config-form room-create-form" onSubmit={createRoom}><h3>Crear habitación</h3><div className="compact-grid"><label>Número o nombre<input name="number" placeholder="Ej. 25 o Suite A" required /></label><label>Piso<select name="floorId" required><option value="">Seleccionar</option>{activeFloors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select></label><label>Tipo<input name="type" defaultValue="Estándar" required /></label><label>Capacidad<input name="capacity" type="number" min="1" defaultValue="2" required /></label><label>Inventario<select value={inventoryMode} onChange={(event) => setInventoryMode(event.target.value)}><option value="BASE">Aplicar inventario base</option><option value="COPY">Copiar otra habitación</option><option value="EMPTY">Comenzar vacío</option></select></label>{inventoryMode === "COPY" && <label>Copiar desde<select name="sourceRoomId" required><option value="">Seleccionar</option>{data.rooms.filter((room) => Boolean(room.active)).map((room) => <option key={room.id} value={room.id}>Habitación {room.number}</option>)}</select></label>}<label className="span-2">Notas<input name="notes" placeholder="Características especiales" /></label></div><button className="primary" disabled={busy}>Añadir habitación</button></form>
      </div>}
      <div className="structure-section"><h3>Pisos</h3><div className="config-list">{data.floors.map((floor) => <FloorConfigRow key={floor.id} floor={floor} rooms={data.rooms.filter((room) => room.floor_id === floor.id)} canEdit={canEdit} busy={busy} onAction={onAction} />)}</div></div>
      <div className="structure-section"><h3>Habitaciones</h3><div className="room-config-list">{data.rooms.map((room) => <RoomConfigRow key={room.id} room={room} floors={activeFloors} canEdit={canEdit} busy={busy} onAction={onAction} />)}</div></div>
    </article>
    <article className="panel settings-card staff-card"><span>👥</span><h2>Personal y accesos</h2><p>{canEdit ? "Registra previamente el correo de cada trabajador. Desactivarlo no borra su historial." : "Consulta quiénes tienen acceso al sistema."}</p>{canEdit && <WorkerInviteForm busy={busy} onAction={onAction} />}<div className="staff-list">{data.users.map((worker) => <div key={worker.id} className={!worker.active ? "inactive" : ""}><span className="staff-avatar">{worker.name.slice(0, 1)}</span><div><b>{worker.name}</b><small>{worker.email}</small></div><select value={worker.role} disabled={worker.id === data.user.id || !canEdit} onChange={(event) => { const reason = window.prompt(`Motivo para cambiar el rol de ${worker.name}:`); if (!reason) return; onAction({ action: "user", userId: worker.id, role: event.target.value, active: Boolean(worker.active), reason }); }}><option value="PROPIETARIO">Propietario</option><option value="ADMINISTRADOR">Administrador</option><option value="RECEPCION">Recepción</option></select><button disabled={worker.id === data.user.id || !canEdit} onClick={() => { const activating = !Boolean(worker.active); const reason = activating ? "Reactivación administrativa" : window.prompt(`Motivo para desactivar a ${worker.name}:`); if (!reason) return; onAction({ action: "user", userId: worker.id, role: worker.role, active: activating, reason }); }}>{worker.active ? "Desactivar" : "Reactivar"}</button></div>)}</div></article>
  </section>;
}

function WorkerInviteForm({ busy, onAction }: { busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const result = await onAction({ action: "user_invite", name: values.get("name"), email: values.get("email"), role: values.get("role"), reason: values.get("reason") });
    if (result) form.reset();
  };
  return <form className="worker-invite" onSubmit={submit}><h3>Autorizar trabajador</h3><label>Nombre<input name="name" placeholder="Nombre completo" required /></label><label>Correo<input name="email" type="email" placeholder="trabajador@correo.com" required /></label><label>Rol<select name="role"><option value="RECEPCION">Recepción</option><option value="ADMINISTRADOR">Administrador</option><option value="PROPIETARIO">Propietario</option></select></label><label>Motivo<input name="reason" defaultValue="Alta de trabajador" required /></label><button className="primary" disabled={busy}>Autorizar correo</button></form>;
}

function FloorConfigRow({ floor, rooms, canEdit, busy, onAction }: { floor: Floor; rooms: Room[]; canEdit: boolean; busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [name, setName] = useState(floor.name);
  const [position, setPosition] = useState(String(floor.position));
  const toggle = () => {
    const willActivate = !Boolean(floor.active);
    const reason = willActivate ? "Reactivación administrativa" : window.prompt("Motivo de desactivación del piso:");
    if (!reason) return;
    onAction({ action: "floor_toggle", floorId: floor.id, active: willActivate, reason });
  };
  return <div className={!floor.active ? "inactive" : ""}><input value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} aria-label="Nombre del piso" /><input className="position-input" value={position} disabled={!canEdit} type="number" min="1" onChange={(event) => setPosition(event.target.value)} aria-label="Orden del piso" /><span>{rooms.filter((room) => Boolean(room.active)).length} activas · {rooms.length} totales</span>{canEdit && <><button disabled={busy} onClick={() => onAction({ action: "floor_update", floorId: floor.id, name, position })}>Guardar</button><button className="muted-action" disabled={busy} onClick={toggle}>{floor.active ? "Desactivar" : "Reactivar"}</button></>}</div>;
}

function RoomConfigRow({ room, floors, canEdit, busy, onAction }: { room: Room; floors: Floor[]; canEdit: boolean; busy: boolean; onAction: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [number, setNumber] = useState(room.number);
  const [floorId, setFloorId] = useState(String(room.floor_id));
  const [type, setType] = useState(room.type);
  const [capacity, setCapacity] = useState(String(room.capacity));
  const toggle = () => {
    const willActivate = !Boolean(room.active);
    const reason = willActivate ? "Reactivación administrativa" : window.prompt(`Motivo de desactivación de la habitación ${room.number}:`);
    if (!reason) return;
    onAction({ action: "room_toggle", roomId: room.id, active: willActivate, reason });
  };
  return <div className={!room.active ? "inactive" : ""}><input value={number} disabled={!canEdit} onChange={(event) => setNumber(event.target.value)} aria-label="Número de habitación" /><select value={floorId} disabled={!canEdit || room.status === "OCUPADA"} onChange={(event) => setFloorId(event.target.value)} aria-label="Piso asignado">{floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select><input value={type} disabled={!canEdit} onChange={(event) => setType(event.target.value)} aria-label="Tipo de habitación" /><input className="capacity-input" value={capacity} disabled={!canEdit} type="number" min="1" onChange={(event) => setCapacity(event.target.value)} aria-label="Capacidad" /><span className={`config-status status-${room.status.toLowerCase()}`}>{labels[room.status]}</span>{canEdit && <><button disabled={busy} onClick={() => onAction({ action: "room", roomId: room.id, floorId, number, type, capacity, notes: room.notes })}>Guardar</button><button className="muted-action" disabled={busy || room.status === "OCUPADA"} onClick={toggle}>{room.active ? "Desactivar" : "Reactivar"}</button></>}</div>;
}

function EventList({ events }: { events: HotelEvent[] }) {
  return <div className="event-list">{events.length ? events.map((event) => <article key={event.id}><span className={`event-icon event-${event.type.toLowerCase()}`}>{event.type === "INGRESO" ? "↘" : event.type === "SALIDA" ? "↗" : event.type === "LIMPIEZA" ? "✦" : event.type === "MANTENIMIENTO" ? "⌁" : "↔"}</span><div><strong>{event.title}</strong><p>Habitación {event.room_number} · {event.detail || "Sin observaciones"}</p></div><aside><b>{new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.created_at))}</b><small>{event.created_by}</small></aside></article>) : <p className="empty">Aún no existen movimientos registrados.</p>}</div>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? "modal-wide" : ""}`}><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>{children}</section></div>;
}

function RoomDetail({ room, data, onReload, onAction, onOpenTasks, onInspection, onPrint, onCheckout, onWorkflow, busy }: { room: Room; data: Data; onReload: () => Promise<void>; onAction: (modal: "checkin" | "event" | "transfer" | "edit" | "inventory" | "correction") => void; onOpenTasks: () => void; onInspection: (kind: InspectionKind) => void; onPrint: (kind: "ENTREGA" | "DEVOLUCION") => void; onCheckout: () => void; onWorkflow: (action: "cleaning_start" | "cleaning_complete" | "cleaning_reopen") => void; busy: boolean }) {
  const [referenceTime] = useState(() => Date.now());
  const currentSegment = data.segments.find((item) => item.id === room.current_segment_id);
  const stayInspections = data.inspections.filter((item) => item.segment_id === room.current_segment_id);
  const stayDocuments = data.documents.filter((item) => item.segment_id === room.current_segment_id);
  const deliveryComplete = stayInspections.some((item) => item.kind === "ENTREGA");
  const deliverySigned = stayDocuments.some((item) => item.category === "ACTA_ENTREGA_FIRMADA");
  const returnComplete = stayInspections.some((item) => item.kind === "DEVOLUCION");
  const returnSigned = stayDocuments.some((item) => item.category === "ACTA_DEVOLUCION_FIRMADA");
  const canCheckout = deliveryComplete && deliverySigned && returnComplete && returnSigned;
  return <><div className="detail-title"><div><p className="eyebrow">{data.floors.find((floor) => floor.id === room.floor_id)?.name}</p><h2>Habitación {room.number}</h2></div><span className={`big-status status-${room.status.toLowerCase()}`}>{labels[room.status]}</span></div>
    <div className="detail-grid"><div className="detail-main"><section className="info-box"><h3>{room.guest_name ? "Estadía activa" : "Información de habitación"}</h3>{room.guest_name ? <div className="guest-profile"><span>{room.guest_name.slice(0, 1)}</span><div><b>{room.guest_name}</b><p>CI {room.guest_ci || "no registrado"} · {room.guest_count || 1} personas</p><small>Ingreso: {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(room.check_in!))}</small></div></div> : <div className="room-facts"><div><small>Tipo</small><b>{room.type}</b></div><div><small>Capacidad</small><b>{room.capacity} personas</b></div><div><small>Estado</small><b>{labels[room.status]}</b></div></div>}</section>
      {room.stay_id && <section className="info-box workflow-card"><h3>{room.status === "OCUPADA" ? "Progreso documental" : "Cierre operativo"}</h3><div className="workflow-steps"><span className={deliveryComplete ? "done" : "current"}><i>{deliveryComplete ? "✓" : "1"}</i> Acta de entrega</span><span className={deliverySigned ? "done" : deliveryComplete ? "current" : "waiting"}><i>{deliverySigned ? "✓" : "2"}</i> Entrega firmada</span><span className={returnComplete ? "done" : deliverySigned ? "current" : "waiting"}><i>{returnComplete ? "✓" : "3"}</i> Devolución</span><span className={returnSigned ? "done" : returnComplete ? "current" : "waiting"}><i>{returnSigned ? "✓" : "4"}</i> Devolución firmada</span>{room.turnover_id && <span className={room.turnover_status === "COMPLETADO" ? "done" : "current"}><i>5</i> Limpieza e inspección</span>}</div>{room.status === "OCUPADA" && !deliverySigned && currentSegment && referenceTime - new Date(currentSegment.started_at).getTime() > 86_400_000 && <p className="workflow-warning">El plazo de 24 horas para cargar el acta de entrega firmada está vencido.</p>}{room.turnover_status && <p className="workflow-note">{room.turnover_status === "PENDIENTE" ? "Limpieza pendiente de inicio." : room.turnover_status === "EN_LIMPIEZA" ? `Limpieza iniciada por ${room.cleaning_started_by || "recepción"}.` : room.turnover_status === "PENDIENTE_INSPECCION" ? "Limpieza terminada; falta la inspección final." : room.turnover_status === "OBSERVADO" ? "La inspección encontró observaciones que deben corregirse." : "Cierre completado."}</p>}</section>}
      {room.stay_id && <SegmentTimeline segments={data.segments.filter((segment) => segment.stay_id === room.stay_id)} currentSegmentId={room.current_segment_id} />}
      <EvidencePanel room={room} documents={data.documents} inspections={data.inspections} inventory={data.inventory.filter((item) => item.room_id === room.id)} onReload={onReload} /></div>
      <aside className="action-stack"><h3>Acciones</h3>{room.status === "DISPONIBLE" && <button className="primary" onClick={() => onAction("checkin")}>Registrar ingreso</button>}{room.status === "OCUPADA" && <>{!deliveryComplete && <button className="primary" onClick={() => onInspection("ENTREGA")}>Completar acta de entrega</button>}{deliveryComplete && <button onClick={() => onPrint("ENTREGA")}>Imprimir acta de entrega</button>}<button onClick={() => onAction("correction")}>Corregir datos de estadía</button>{deliverySigned && !returnComplete && <button onClick={() => onInspection("DEVOLUCION")}>Completar acta de devolución</button>}{returnComplete && <button onClick={() => onPrint("DEVOLUCION")}>Imprimir acta de devolución</button>}<button disabled={!returnComplete || !returnSigned} onClick={() => onAction("transfer")}>Cambiar habitación</button><button className="danger-light" disabled={busy || !canCheckout} title={!canCheckout ? "Completa y carga ambas actas firmadas" : undefined} onClick={onCheckout}>Registrar salida</button></>}{room.status === "LIMPIEZA" && room.turnover_status === "PENDIENTE" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_start")}>Iniciar limpieza</button>}{room.status === "LIMPIEZA" && room.turnover_status === "EN_LIMPIEZA" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_complete")}>Finalizar limpieza</button>}{room.status === "LIMPIEZA" && room.turnover_status === "PENDIENTE_INSPECCION" && <button className="primary" onClick={() => onInspection("LIMPIEZA_FINAL")}>Realizar inspección final</button>}{room.status === "MANTENIMIENTO" && room.turnover_status === "OBSERVADO" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_reopen")}>Enviar nuevamente a limpieza</button>}<button className="task-action" onClick={onOpenTasks}>Crear o ver tareas</button><button onClick={() => onAction("event")}>Añadir evento</button>{data.user.role !== "RECEPCION" && <><button onClick={() => onAction("inventory")}>Editar inventario</button><button onClick={() => onAction("edit")}>Editar habitación</button></>}</aside></div></>;
}

function SegmentTimeline({ segments, currentSegmentId }: { segments: StaySegment[]; currentSegmentId?: number }) {
  if (!segments.length) return null;
  return <section className="info-box segment-history"><div className="segment-heading"><div><h3>Historial de habitaciones</h3><p className="help">Cada tramo conserva sus propias actas, fotografías e inspecciones.</p></div><strong>{segments.length} {segments.length === 1 ? "segmento" : "segmentos"}</strong></div><div className="segment-list">{segments.map((segment) => <article key={segment.id} className={segment.id === currentSegmentId ? "current" : "closed"}><i>{segment.sequence}</i><div><div className="segment-title"><b>Habitación {segment.room_number}</b><span>{segment.ended_at ? "Cerrado" : "Actual"}</span></div><p>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(segment.started_at))} → {segment.ended_at ? new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(segment.ended_at)) : "En curso"}</p><small>{segment.start_reason.replace("TRASLADO: ", "Motivo: ")}</small><div className="segment-badges"><em>{segment.delivery_count ? "✓" : "○"} Entrega</em><em>{segment.delivery_signed ? "✓" : "○"} Firma entrega</em><em>{segment.return_count ? "✓" : "○"} Devolución</em><em>{segment.return_signed ? "✓" : "○"} Firma devolución</em><em>{segment.document_count} archivo(s)</em></div></div></article>)}</div></section>;
}

function EvidencePanel({ room, documents, inspections, inventory, onReload }: { room: Room; documents: HotelDocument[]; inspections: Inspection[]; inventory: InventoryItem[]; onReload: () => Promise<void> }) {
  const [category, setCategory] = useState("VISTA_GENERAL");
  const hasReturnInspection = inspections.some((item) => item.segment_id === room.current_segment_id && item.kind === "DEVOLUCION");
  const [phase, setPhase] = useState<"GENERAL" | "ENTREGA" | "DEVOLUCION">(hasReturnInspection || room.status !== "OCUPADA" ? "DEVOLUCION" : "ENTREGA");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const names = inventory.map((item) => item.name.toLowerCase()).join(" ");
  const required = ["VISTA_GENERAL", "BANO", ...( /(cama|almohada|sábana|sabana|cubrecama)/.test(names) ? ["CAMA"] : [] ), ...( /(mesa|cómoda|comoda|silla|poltrona|mueble)/.test(names) ? ["MUEBLES"] : [] ), ...( /televisi/.test(names) ? ["TELEVISION"] : [] ), ...( /ventilador/.test(names) ? ["VENTILADOR"] : [] )];
  const roomDocuments = documents.filter((document) => room.current_segment_id ? document.segment_id === room.current_segment_id : document.room_id === room.id && !document.stay_id);
  const completed = required.filter((item) => roomDocuments.some((document) => document.category === item && (document.phase === phase || document.phase === "GENERAL")));
  const options = [...required, "DANOS", "OTRA_EVIDENCIA", ...(phase === "ENTREGA" ? ["ACTA_ENTREGA_FIRMADA", "CONTRATO"] : phase === "DEVOLUCION" ? ["ACTA_DEVOLUCION_FIRMADA"] : ["CONTRATO"])];
  const upload = async () => {
    if (!file) return;
    setUploading(true); setMessage("");
    const form = new FormData(); form.set("file", file); form.set("roomId", String(room.id)); if (room.stay_id) form.set("stayId", String(room.stay_id)); if (room.current_segment_id) form.set("segmentId", String(room.current_segment_id)); form.set("phase", phase); form.set("category", category);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el archivo.");
      setFile(null); setMessage("Evidencia guardada correctamente."); await onReload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el archivo."); }
    finally { setUploading(false); }
  };
  return <section className="info-box evidence-panel"><div className="evidence-heading"><div><h3>Documentos y evidencias</h3><p className="help">Separa las fotografías de entrega y devolución para conservar ambos estados.</p></div><strong>{completed.length}/{required.length}</strong></div><div className="phase-tabs"><button className={phase === "ENTREGA" ? "active" : ""} onClick={() => { setPhase("ENTREGA"); setCategory("VISTA_GENERAL"); }}>Entrega</button><button className={phase === "DEVOLUCION" ? "active" : ""} onClick={() => { setPhase("DEVOLUCION"); setCategory("VISTA_GENERAL"); }}>Devolución</button><button className={phase === "GENERAL" ? "active" : ""} onClick={() => { setPhase("GENERAL"); setCategory("CONTRATO"); }}>General</button></div><div className="evidence-progress"><i style={{ width: `${required.length ? (completed.length / required.length) * 100 : 100}%` }} /></div><div className="evidence-checks">{required.map((item) => <span key={item} className={completed.includes(item) ? "done" : "pending"}>{completed.includes(item) ? "✓" : "○"} {evidenceLabels[item]}</span>)}</div><div className="upload-row"><select value={category} onChange={(event) => setCategory(event.target.value)}>{options.map((item) => <option key={item} value={item}>{evidenceLabels[item]}</option>)}</select><label className="file-picker">{file ? file.name : "Tomar foto o elegir archivo"}<input type="file" accept="image/*,.pdf" capture={category.startsWith("ACTA_") || category === "CONTRATO" ? undefined : "environment"} onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button disabled={!file || uploading} onClick={upload}>{uploading ? "Subiendo…" : "Guardar"}</button></div>{message && <p className="evidence-message">{message}</p>}<div className="document-gallery">{roomDocuments.length ? roomDocuments.map((document) => <a key={document.id} href={`/api/documents?id=${document.id}`} target="_blank" rel="noreferrer"><span>{document.content_type.startsWith("image/") ? "▧" : "▤"}</span><div><b>{evidenceLabels[document.category] || document.category}</b><small>{document.phase === "ENTREGA" ? "Entrega" : document.phase === "DEVOLUCION" ? "Devolución" : "General"} · {document.filename} · {new Intl.DateTimeFormat("es-BO", { dateStyle: "short" }).format(new Date(document.created_at))}</small></div></a>) : <p className="empty-inline">Todavía no hay archivos guardados.</p>}</div></section>;
}

function CheckIn({ room, userRole, companions, setCompanions, busy, onSubmit }: { room: Room; userRole: string; companions: Companion[]; setCompanions: (value: Companion[]) => void; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [primary, setPrimary] = useState({ fullName: "", ci: "", phone: "" });
  const [identificationPending, setIdentificationPending] = useState(false);
  const [stayType, setStayType] = useState("DIA");
  const [lookupMessage, setLookupMessage] = useState("");
  const [capacityOverride, setCapacityOverride] = useState(false);
  const occupantCount = 1 + companions.filter((item) => item.fullName.trim()).length;
  const overCapacity = occupantCount > room.capacity;
  const canAuthorize = userRole === "PROPIETARIO" || userRole === "ADMINISTRADOR";
  const lookup = async () => {
    if (!primary.ci.trim()) return;
    setLookupMessage("Buscando huésped…");
    try {
      const response = await fetch("/api/hotel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "guest_lookup", ci: primary.ci }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.guest) { setPrimary({ fullName: result.guest.full_name, ci: result.guest.ci, phone: result.guest.phone || "" }); setIdentificationPending(false); setLookupMessage(result.guest.active_room_id ? "Este huésped ya tiene una estadía activa." : `Ficha encontrada · ${result.guest.stay_count} estadía(s) anterior(es).`); }
      else setLookupMessage("CI nuevo: se creará una ficha de huésped.");
    } catch (error) { setLookupMessage(error instanceof Error ? error.message : "No se pudo buscar el CI."); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ primary, identificationPending, stayType: form.get("stayType"), expectedCheckOut: form.get("expectedCheckOut") || null, notes: form.get("notes"), companions, capacityOverride: overCapacity && capacityOverride, capacityOverrideReason: form.get("capacityOverrideReason") }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Nuevo ingreso</p><h2>Habitación {room.number}</h2><p>Registra al titular y a todas las personas que ocuparán la habitación.</p></div><div className="form-section"><h3>Huésped titular</h3><div className="form-grid"><label className="span-2">Nombre completo<input required autoFocus placeholder="Nombres y apellidos" value={primary.fullName} onChange={(event) => setPrimary({ ...primary, fullName: event.target.value })} /></label><label>CI o documento<div className="lookup-field"><input placeholder="Ej. 7654321" value={primary.ci} disabled={identificationPending} onChange={(event) => setPrimary({ ...primary, ci: event.target.value })} onBlur={lookup} /><button type="button" disabled={!primary.ci || identificationPending} onClick={lookup}>Buscar</button></div></label><label>Celular / WhatsApp<input placeholder="Ej. 70000000" value={primary.phone} onChange={(event) => setPrimary({ ...primary, phone: event.target.value })} /></label><label className="pending-check"><input type="checkbox" checked={identificationPending} onChange={(event) => { setIdentificationPending(event.target.checked); if (event.target.checked) setPrimary({ ...primary, ci: "" }); }} /> Identificación pendiente</label>{lookupMessage && <p className="lookup-message">{lookupMessage}</p>}<label>Tipo de estadía<select name="stayType" value={stayType} onChange={(event) => setStayType(event.target.value)}><option value="DIA">Por día</option><option value="SEMANA">Por semana</option><option value="MES">Por mes</option><option value="ARRENDAMIENTO">Arrendamiento</option></select></label><label>Salida prevista<input name="expectedCheckOut" type="date" required={stayType !== "ARRENDAMIENTO"} /></label><label className="span-2">Observaciones<textarea name="notes" placeholder="Condiciones especiales, referencias u observaciones…" /></label></div></div><div className="form-section"><div className="section-line"><h3>Acompañantes ({companions.length})</h3><button type="button" className="text-button" onClick={() => setCompanions([...companions, { fullName: "", ci: "", phone: "", isMinor: false }])}>＋ Añadir persona</button></div>{companions.map((companion, index) => <div className="companion-row" key={index}><input aria-label="Nombre del acompañante" placeholder="Nombre completo" value={companion.fullName} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))} /><input aria-label="CI del acompañante" placeholder="CI (opcional)" value={companion.ci} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, ci: e.target.value } : item))} /><label className="minor-check"><input type="checkbox" checked={companion.isMinor} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, isMinor: e.target.checked } : item))} /> Menor</label><button type="button" onClick={() => setCompanions(companions.filter((_, i) => i !== index))}>×</button></div>)}{!companions.length && <p className="empty-inline">No hay acompañantes registrados.</p>}{overCapacity && <div className="capacity-warning"><b>Capacidad excedida: {occupantCount} personas para {room.capacity} plazas.</b>{canAuthorize ? <><label><input type="checkbox" checked={capacityOverride} onChange={(event) => setCapacityOverride(event.target.checked)} /> Autorizar excepcionalmente</label>{capacityOverride && <textarea name="capacityOverrideReason" required placeholder="Motivo de la autorización…" />}</> : <p>Debe realizar el ingreso un propietario o administrador.</p>}</div>}</div><div className="form-actions"><span>Se creará el acta de entrega después del ingreso.</span><button className="primary" disabled={busy || (overCapacity && (!canAuthorize || !capacityOverride))}>{busy ? "Guardando…" : "Confirmar ingreso"}</button></div></form>;
}

function EventForm({ room, busy, onSubmit }: { room: Room; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ type: form.get("type"), title: form.get("title"), detail: form.get("detail"), status: form.get("status") }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Bitácora · Habitación {room.number}</p><h2>Registrar evento</h2></div><div className="form-grid one"><label>Tipo<select name="type"><option value="LIMPIEZA">Limpieza</option><option value="MANTENIMIENTO">Mantenimiento o reparación</option><option value="MUEBLES">Traslado o acomodo de muebles</option><option value="INSPECCION">Inspección</option><option value="DANO">Reporte de daño</option><option value="OTRO">Otro</option></select></label><label>Título<input name="title" required placeholder="Ej. Reparar ducha del baño" /></label><label>Estado<select name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="COMPLETADO">Completado</option></select></label><label>Detalle<textarea name="detail" placeholder="Describe el trabajo, daño o resultado…" /></label></div><div className="form-actions"><span>El evento quedará en el historial permanente.</span><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar evento"}</button></div></form>;
}

function Transfer({ room, rooms, userRole, busy, onSubmit }: { room: Room; rooms: Room[]; userRole: string; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [capacityOverride, setCapacityOverride] = useState(false);
  const target = rooms.find((item) => item.id === Number(destination));
  const overCapacity = Boolean(target && Number(room.guest_count || 1) > target.capacity);
  const canAuthorize = userRole === "PROPIETARIO" || userRole === "ADMINISTRADOR";
  return <div><div className="form-title"><p className="eyebrow">Cambio de habitación</p><h2>Trasladar desde la {room.number}</h2><p>Se cerrará el segmento actual y se abrirá uno nuevo sin perder documentos ni fechas.</p></div><div className="form-grid one"><label>Habitación de destino<select value={destination} onChange={(event) => { setDestination(event.target.value); setCapacityOverride(false); }}><option value="">Seleccionar habitación disponible</option>{rooms.filter((item) => item.id !== room.id && item.status === "DISPONIBLE" && Boolean(item.active)).map((item) => <option key={item.id} value={item.id}>Habitación {item.number} · {item.type} · {item.capacity} personas</option>)}</select></label><label>Motivo del traslado<textarea value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Ej. Solicitud del huésped por mayor espacio…" /></label></div>{overCapacity && <div className="capacity-warning"><b>La habitación elegida admite {target?.capacity} personas y la estadía tiene {room.guest_count || 1} ocupantes.</b>{canAuthorize ? <label><input type="checkbox" checked={capacityOverride} onChange={(event) => setCapacityOverride(event.target.checked)} /> Autorizar traslado por sobrecapacidad</label> : <p>El traslado debe ser autorizado por un propietario o administrador.</p>}</div>}<div className="callout">La habitación {room.number} entrará en limpieza. La habitación de destino solicitará una nueva acta y nuevas evidencias de entrega.</div><button className="primary full-button" disabled={!destination || !reason.trim() || busy || (overCapacity && (!canAuthorize || !capacityOverride))} onClick={() => onSubmit({ destinationRoomId: Number(destination), reason: reason.trim(), capacityOverride })}>{busy ? "Trasladando…" : "Confirmar traslado"}</button></div>;
}

function EditRoom({ room, busy, onSubmit }: { room: Room; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ number: form.get("number"), type: form.get("type"), capacity: form.get("capacity"), notes: form.get("notes") }); }; return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Configuración</p><h2>Editar habitación {room.number}</h2></div><div className="form-grid one"><label>Número o nombre<input name="number" defaultValue={room.number} required /></label><label>Tipo<input name="type" defaultValue={room.type} required /></label><label>Capacidad<input name="capacity" type="number" min="1" defaultValue={room.capacity} required /></label><label>Notas<textarea name="notes" defaultValue={room.notes} /></label></div><div className="form-actions"><span>Los cambios aparecerán inmediatamente.</span><button className="primary" disabled={busy}>Guardar cambios</button></div></form>; }

function InventoryEditor({ room, items, busy, onSave, onDelete }: { room: Room; items: InventoryItem[]; busy: boolean; onSave: (payload: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ itemId: editing?.id, name: form.get("name"), quantity: form.get("quantity"), notes: form.get("notes") }); setEditing(null); event.currentTarget.reset(); };
  return <div><div className="form-title"><p className="eyebrow">Habitación {room.number}</p><h2>Inventario entregable</h2><p>Estos elementos aparecerán automáticamente en las actas de entrada y salida.</p></div><div className="inventory-list">{items.map((item) => <div key={item.id}><b>{item.quantity} × {item.name}</b><small>{item.notes || "Sin observaciones"}</small><button onClick={() => setEditing(item)}>Editar</button><button className="delete-mini" onClick={() => onDelete(item.id)}>Quitar</button></div>)}</div><form className="inventory-add" onSubmit={submit} key={editing?.id || "new"}><h3>{editing ? "Editar elemento" : "Añadir elemento"}</h3><div className="form-grid"><label>Elemento<input name="name" defaultValue={editing?.name || ""} placeholder="Ej. Televisión" required /></label><label>Cantidad<input name="quantity" type="number" min="1" defaultValue={editing?.quantity || 1} required /></label><label className="span-2">Detalle opcional<input name="notes" defaultValue={editing?.notes || ""} placeholder="Ej. Control remoto incluido" /></label></div><div className="form-actions"><button type="button" className="text-button" onClick={() => setEditing(null)}>Limpiar</button><button className="primary" disabled={busy}>{editing ? "Actualizar" : "Añadir al inventario"}</button></div></form></div>;
}

function InspectionForm({ room, kind, items, busy, onSubmit }: { room: Room; kind: InspectionKind; items: InventoryItem[]; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [checks, setChecks] = useState(items.map((item) => ({ ...item, condition: "BUENO", itemNotes: "" })));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ notes: form.get("notes"), items: checks.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, condition: item.condition, notes: item.itemNotes })) }); };
  const finalCleaning = kind === "LIMPIEZA_FINAL";
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Habitación {room.number}</p><h2>{finalCleaning ? "Inspección final de limpieza" : `Acta de ${kind === "ENTREGA" ? "entrega" : "devolución"}`}</h2><p>{finalCleaning ? "Confirma que la habitación quedó lista. Cualquier elemento observado la enviará a mantenimiento." : "Revisa cada elemento antes de generar el documento para firma."}</p></div><div className="inspection-list">{checks.map((item, index) => <div key={item.id}><span><b>{item.quantity} × {item.name}</b><small>{item.notes || "Elemento de habitación"}</small></span><select value={item.condition} onChange={(e) => setChecks(checks.map((check, i) => i === index ? { ...check, condition: e.target.value } : check))}><option value="BUENO">Bueno</option><option value="OBSERVADO">Observado</option><option value="FALTANTE">Faltante</option></select><input placeholder="Observación" value={item.itemNotes} onChange={(e) => setChecks(checks.map((check, i) => i === index ? { ...check, itemNotes: e.target.value } : check))} /></div>)}</div><label className="standalone-label inspection-notes">Observaciones generales<textarea name="notes" placeholder={finalCleaning ? "Resultado de limpieza o correcciones necesarias…" : "Daños previos, detalles de devolución o acuerdos…"} /></label><div className="form-actions"><span>{finalCleaning ? "Si todo está en buen estado, la habitación quedará disponible." : "Al guardar se abrirá el documento para imprimir."}</span><button className="primary" disabled={busy}>{busy ? "Guardando…" : finalCleaning ? "Finalizar inspección" : "Guardar y generar acta"}</button></div></form>;
}

function DeliveryAct({ room, kind, inspection, items, fallbackItems, onPrint }: { room: Room; kind: "ENTREGA" | "DEVOLUCION"; inspection?: Inspection; items: InspectionItem[]; fallbackItems: InventoryItem[]; onPrint: () => void }) {
  const actItems = inspection ? items.filter((item) => item.inspection_id === inspection.id) : fallbackItems.map((item) => ({ id: item.id, inspection_id: 0, name: item.name, quantity: item.quantity, condition: "BUENO" as const, notes: "" }));
  return <div className="print-wrapper"><div className="print-toolbar"><div><p className="eyebrow">{inspection ? "Documento guardado" : "Plantilla preliminar"}</p><h2>Acta de {kind === "ENTREGA" ? "entrega" : "devolución"}</h2></div><button className="primary" onClick={onPrint}>Imprimir acta</button></div><article className="acta"><header><span className="brand-mark">A</span><div><h2>HOTEL ASAEL</h2><p>ACTA DE {kind === "ENTREGA" ? "ENTREGA" : "DEVOLUCIÓN"} DE HABITACIÓN</p></div><b>Habitación {room.number}</b></header><section className="acta-meta"><div><small>Huésped titular</small><strong>{room.guest_name}</strong></div><div><small>CI</small><strong>{room.guest_ci || "________________"}</strong></div><div><small>Fecha</small><strong>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(inspection ? new Date(inspection.created_at) : new Date())}</strong></div><div><small>Tipo de estadía</small><strong>{labels[room.stay_type || ""]}</strong></div></section><p>Las partes dejan constancia del estado de la habitación y de los elementos detallados a continuación:</p><table><thead><tr><th>Elemento verificado</th><th>Cantidad</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>{actItems.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{item.condition === "BUENO" ? "Bueno" : item.condition === "OBSERVADO" ? "Observado" : "Faltante"}</td><td>{item.notes}</td></tr>)}</tbody></table><div className="acta-notes"><b>Observaciones generales:</b> {inspection?.notes || ""}</div><footer><div><span /><b>Firma del huésped</b><small>Nombre y CI</small></div><div><span /><b>Firma del encargado</b><small>{inspection?.created_by || "Hotel ASAEL"}</small></div></footer></article></div>;
}
