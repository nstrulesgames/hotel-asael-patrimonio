"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Floor = { id: number; name: string; position: number; active: number };
type Room = { id: number; floor_id: number; number: string; type: string; capacity: number; status: string; notes: string; active: number; stay_id?: number; stay_type?: string; check_in?: string; expected_check_out?: string; guest_name?: string; guest_ci?: string; guest_count?: number; turnover_id?: number; turnover_status?: "PENDIENTE" | "EN_LIMPIEZA" | "PENDIENTE_INSPECCION" | "OBSERVADO" | "COMPLETADO"; cleaning_started_at?: string; cleaning_started_by?: string; cleaning_completed_at?: string; cleaning_completed_by?: string };
type HotelEvent = { id: number; room_id: number; room_number: string; type: string; title: string; detail: string; status: string; created_by: string; created_at: string };
type InventoryItem = { id: number; room_id: number; name: string; quantity: number; notes: string };
type InspectionKind = "ENTREGA" | "DEVOLUCION" | "LIMPIEZA_FINAL";
type Inspection = { id: number; stay_id: number; room_id: number; kind: InspectionKind; notes: string; created_by: string; created_at: string };
type InspectionItem = { id: number; inspection_id: number; inventory_item_id?: number; name: string; quantity: number; condition: "BUENO" | "OBSERVADO" | "FALTANTE"; notes: string };
type Worker = { id: number; name: string; email: string; role: string; active: number; created_at: string };
type HotelDocument = { id: number; room_id: number; stay_id?: number; phase: "GENERAL" | "ENTREGA" | "DEVOLUCION"; category: string; filename: string; content_type: string; uploaded_by: string; created_at: string };
type OperationalAlert = { type: "ACTA_ENTREGA_VENCIDA" | "CIERRE_OPERATIVO"; room_id: number; room_number: string; stay_id: number; created_at: string };
type Data = { user: { id: number; name: string; email: string; role: string }; floors: Floor[]; rooms: Room[]; events: HotelEvent[]; inventory: InventoryItem[]; inspections: Inspection[]; inspectionItems: InspectionItem[]; users: Worker[]; documents: HotelDocument[]; alerts: OperationalAlert[] };
type Companion = { fullName: string; ci: string; phone: string; isMinor: boolean };

const labels: Record<string, string> = {
  DISPONIBLE: "Disponible", OCUPADA: "Ocupada", LIMPIEZA: "En limpieza", MANTENIMIENTO: "Mantenimiento", FUERA_SERVICIO: "Fuera de servicio",
  DIA: "Por día", SEMANA: "Por semana", MES: "Por mes", ARRENDAMIENTO: "Arrendamiento",
  PROPIETARIO: "Propietario", ADMINISTRADOR: "Administrador", RECEPCION: "Recepción",
};

const statusOrder = ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"];
const evidenceLabels: Record<string, string> = { VISTA_GENERAL: "Vista general", CAMA: "Cama y ropa de cama", MUEBLES: "Muebles", BANO: "Baño", TELEVISION: "Televisión", VENTILADOR: "Ventilador", DANOS: "Daños u observaciones", OTRA_EVIDENCIA: "Otra evidencia", CONTRATO: "Contrato", ACTA_ENTREGA_FIRMADA: "Acta de entrega firmada", ACTA_DEVOLUCION_FIRMADA: "Acta de devolución firmada" };

export default function HotelDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | "all">("all");
  const [selected, setSelected] = useState<Room | null>(null);
  const [modal, setModal] = useState<"room" | "checkin" | "event" | "transfer" | "edit" | "inventory" | "inspection" | "print" | null>(null);
  const [inspectionKind, setInspectionKind] = useState<InspectionKind>("ENTREGA");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [view, setView] = useState<"habitaciones" | "actividad" | "configuracion">("habitaciones");

  const load = useCallback(async () => {
    const response = await fetch("/api/hotel", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo cargar el hotel");
    setData(result);
    setSelected((current) => current ? result.rooms.find((room: Room) => room.id === current.id) || null : null);
  }, []);

  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/hotel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo completar la operación");
      await load();
      setModal(null);
      setNotice("Cambios guardados correctamente.");
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ocurrió un error");
      return null;
    } finally { setBusy(false); }
  };

  const operationalRooms = useMemo(() => data?.rooms.filter((room) => Boolean(room.active)) || [], [data]);
  const visibleRooms = useMemo(() => operationalRooms.filter((room) => activeFloor === "all" || room.floor_id === activeFloor), [operationalRooms, activeFloor]);
  const counts = useMemo(() => Object.fromEntries(statusOrder.map((status) => [status, operationalRooms.filter((room) => room.status === status).length])), [operationalRooms]);

  const openRoom = (room: Room) => { setSelected(room); setModal("room"); };

  if (!data && notice) return <div className="access-blocked"><span className="brand-mark">A</span><h1>Acceso no disponible</h1><p>{notice}</p><a href="/signout-with-chatgpt?return_to=/">Usar otro correo</a></div>;
  if (!data) return <div className="loading"><span className="brand-mark">A</span><p>Preparando Hotel ASAEL…</p></div>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A</span><div><b>ASAEL</b><small>Gestión hotelera</small></div></div>
        <nav>
          <button className={view === "habitaciones" ? "active" : ""} onClick={() => setView("habitaciones")}><span>▦</span> Habitaciones</button>
          <button className={view === "actividad" ? "active" : ""} onClick={() => setView("actividad")}><span>◷</span> Actividad</button>
          <button className={view === "configuracion" ? "active" : ""} onClick={() => setView("configuracion")}><span>⚙</span> Configuración</button>
        </nav>
        <div className="sidebar-note"><strong>Operación interna</strong><p>Las actas se imprimen, firman en papel y luego se respaldan aquí.</p></div>
        <div className="user-card"><span>{data.user.name.slice(0, 1).toUpperCase()}</span><div><b>{data.user.name}</b><small>{labels[data.user.role] || data.user.role}</small></div></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Hotel ASAEL · {new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p><h1>{view === "habitaciones" ? "Estado del hotel" : view === "actividad" ? "Bitácora operativa" : "Configuración del hotel"}</h1></div>
          <button className="primary" onClick={() => { const room = data.rooms.find((item) => item.status === "DISPONIBLE"); if (room) { setSelected(room); setCompanions([]); setModal("checkin"); } else setNotice("No hay habitaciones disponibles."); }}>＋ Registrar ingreso</button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {view === "habitaciones" && data.alerts.length > 0 && <section className="ops-alerts" aria-label="Alertas operativas">{data.alerts.slice(0, 4).map((alert) => <button key={`${alert.type}-${alert.room_id}`} onClick={() => { const room = data.rooms.find((item) => item.id === alert.room_id); if (room) openRoom(room); }}><span>{alert.type === "ACTA_ENTREGA_VENCIDA" ? "!" : "↻"}</span><div><b>Habitación {alert.room_number}</b><small>{alert.type === "ACTA_ENTREGA_VENCIDA" ? "Acta de entrega firmada vencida" : "Cierre de limpieza pendiente"}</small></div></button>)}</section>}

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

        {view === "configuracion" && <ConfigurationView data={data} busy={busy} onAction={action} />}
      </section>

      {modal && selected && <Modal onClose={() => setModal(null)} wide={modal === "room" || modal === "print"}>
        {modal === "room" && <RoomDetail room={selected} data={data} onReload={load} onAction={(next) => setModal(next)} onInspection={(kind) => { setInspectionKind(kind); setModal("inspection"); }} onPrint={(kind) => { setInspectionKind(kind); setModal("print"); }} onCheckout={() => action({ action: "checkout", roomId: selected.id })} onWorkflow={(workflowAction) => action({ action: workflowAction, roomId: selected.id, turnoverId: selected.turnover_id })} busy={busy} />}
        {modal === "checkin" && <CheckIn room={selected} userRole={data.user.role} companions={companions} setCompanions={setCompanions} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "checkin", roomId: selected.id, ...payload }); if (result) setCompanions([]); }} />}
        {modal === "event" && <EventForm room={selected} busy={busy} onSubmit={(payload) => action({ action: "event", roomId: selected.id, stayId: selected.stay_id, ...payload })} />}
        {modal === "transfer" && <Transfer room={selected} rooms={data.rooms} busy={busy} onSubmit={(destinationRoomId) => action({ action: "transfer", roomId: selected.id, destinationRoomId })} />}
        {modal === "edit" && <EditRoom room={selected} busy={busy} onSubmit={(payload) => action({ action: "room", roomId: selected.id, ...payload })} />}
        {modal === "inventory" && <InventoryEditor room={selected} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSave={(payload) => action({ action: "inventory", roomId: selected.id, ...payload })} onDelete={(itemId) => action({ action: "inventory_delete", roomId: selected.id, itemId })} />}
        {modal === "inspection" && <InspectionForm room={selected} kind={inspectionKind} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "inspection", roomId: selected.id, stayId: selected.stay_id, kind: inspectionKind, ...payload }); if (result && inspectionKind !== "LIMPIEZA_FINAL") { setInspectionKind(inspectionKind); setModal("print"); } }} />}
        {modal === "print" && inspectionKind !== "LIMPIEZA_FINAL" && <DeliveryAct room={selected} kind={inspectionKind} inspection={data.inspections.find((item) => item.stay_id === selected.stay_id && item.room_id === selected.id && item.kind === inspectionKind)} items={data.inspectionItems} fallbackItems={data.inventory.filter((item) => item.room_id === selected.id)} onPrint={() => window.print()} />}
      </Modal>}
    </main>
  );
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

function RoomDetail({ room, data, onReload, onAction, onInspection, onPrint, onCheckout, onWorkflow, busy }: { room: Room; data: Data; onReload: () => Promise<void>; onAction: (modal: "checkin" | "event" | "transfer" | "edit" | "inventory") => void; onInspection: (kind: InspectionKind) => void; onPrint: (kind: "ENTREGA" | "DEVOLUCION") => void; onCheckout: () => void; onWorkflow: (action: "cleaning_start" | "cleaning_complete" | "cleaning_reopen") => void; busy: boolean }) {
  const stayInspections = data.inspections.filter((item) => item.stay_id === room.stay_id && item.room_id === room.id);
  const stayDocuments = data.documents.filter((item) => item.stay_id === room.stay_id && item.room_id === room.id);
  const deliveryComplete = stayInspections.some((item) => item.kind === "ENTREGA");
  const deliverySigned = stayDocuments.some((item) => item.category === "ACTA_ENTREGA_FIRMADA");
  const returnComplete = stayInspections.some((item) => item.kind === "DEVOLUCION");
  const returnSigned = stayDocuments.some((item) => item.category === "ACTA_DEVOLUCION_FIRMADA");
  const canCheckout = deliveryComplete && deliverySigned && returnComplete && returnSigned;
  return <><div className="detail-title"><div><p className="eyebrow">{data.floors.find((floor) => floor.id === room.floor_id)?.name}</p><h2>Habitación {room.number}</h2></div><span className={`big-status status-${room.status.toLowerCase()}`}>{labels[room.status]}</span></div>
    <div className="detail-grid"><div className="detail-main"><section className="info-box"><h3>{room.guest_name ? "Estadía activa" : "Información de habitación"}</h3>{room.guest_name ? <div className="guest-profile"><span>{room.guest_name.slice(0, 1)}</span><div><b>{room.guest_name}</b><p>CI {room.guest_ci || "no registrado"} · {room.guest_count || 1} personas</p><small>Ingreso: {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(room.check_in!))}</small></div></div> : <div className="room-facts"><div><small>Tipo</small><b>{room.type}</b></div><div><small>Capacidad</small><b>{room.capacity} personas</b></div><div><small>Estado</small><b>{labels[room.status]}</b></div></div>}</section>
      {room.stay_id && <section className="info-box workflow-card"><h3>{room.status === "OCUPADA" ? "Progreso documental" : "Cierre operativo"}</h3><div className="workflow-steps"><span className={deliveryComplete ? "done" : "current"}><i>{deliveryComplete ? "✓" : "1"}</i> Acta de entrega</span><span className={deliverySigned ? "done" : deliveryComplete ? "current" : "waiting"}><i>{deliverySigned ? "✓" : "2"}</i> Entrega firmada</span><span className={returnComplete ? "done" : deliverySigned ? "current" : "waiting"}><i>{returnComplete ? "✓" : "3"}</i> Devolución</span><span className={returnSigned ? "done" : returnComplete ? "current" : "waiting"}><i>{returnSigned ? "✓" : "4"}</i> Devolución firmada</span>{room.turnover_id && <span className={room.turnover_status === "COMPLETADO" ? "done" : "current"}><i>5</i> Limpieza e inspección</span>}</div>{room.status === "OCUPADA" && !deliverySigned && room.check_in && Date.now() - new Date(room.check_in).getTime() > 86_400_000 && <p className="workflow-warning">El plazo de 24 horas para cargar el acta de entrega firmada está vencido.</p>}{room.turnover_status && <p className="workflow-note">{room.turnover_status === "PENDIENTE" ? "Limpieza pendiente de inicio." : room.turnover_status === "EN_LIMPIEZA" ? `Limpieza iniciada por ${room.cleaning_started_by || "recepción"}.` : room.turnover_status === "PENDIENTE_INSPECCION" ? "Limpieza terminada; falta la inspección final." : room.turnover_status === "OBSERVADO" ? "La inspección encontró observaciones que deben corregirse." : "Cierre completado."}</p>}</section>}
      <EvidencePanel room={room} documents={data.documents} inspections={data.inspections} inventory={data.inventory.filter((item) => item.room_id === room.id)} onReload={onReload} /></div>
      <aside className="action-stack"><h3>Acciones</h3>{room.status === "DISPONIBLE" && <button className="primary" onClick={() => onAction("checkin")}>Registrar ingreso</button>}{room.status === "OCUPADA" && <>{!deliveryComplete && <button className="primary" onClick={() => onInspection("ENTREGA")}>Completar acta de entrega</button>}{deliveryComplete && <button onClick={() => onPrint("ENTREGA")}>Imprimir acta de entrega</button>}{deliverySigned && !returnComplete && <button onClick={() => onInspection("DEVOLUCION")}>Completar acta de devolución</button>}{returnComplete && <button onClick={() => onPrint("DEVOLUCION")}>Imprimir acta de devolución</button>}<button disabled={!returnComplete || !returnSigned} onClick={() => onAction("transfer")}>Cambiar habitación</button><button className="danger-light" disabled={busy || !canCheckout} title={!canCheckout ? "Completa y carga ambas actas firmadas" : undefined} onClick={onCheckout}>Registrar salida</button></>}{room.status === "LIMPIEZA" && room.turnover_status === "PENDIENTE" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_start")}>Iniciar limpieza</button>}{room.status === "LIMPIEZA" && room.turnover_status === "EN_LIMPIEZA" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_complete")}>Finalizar limpieza</button>}{room.status === "LIMPIEZA" && room.turnover_status === "PENDIENTE_INSPECCION" && <button className="primary" onClick={() => onInspection("LIMPIEZA_FINAL")}>Realizar inspección final</button>}{room.status === "MANTENIMIENTO" && room.turnover_status === "OBSERVADO" && <button className="primary" disabled={busy} onClick={() => onWorkflow("cleaning_reopen")}>Enviar nuevamente a limpieza</button>}<button onClick={() => onAction("event")}>Añadir evento</button>{data.user.role !== "RECEPCION" && <><button onClick={() => onAction("inventory")}>Editar inventario</button><button onClick={() => onAction("edit")}>Editar habitación</button></>}</aside></div></>;
}

function EvidencePanel({ room, documents, inspections, inventory, onReload }: { room: Room; documents: HotelDocument[]; inspections: Inspection[]; inventory: InventoryItem[]; onReload: () => Promise<void> }) {
  const [category, setCategory] = useState("VISTA_GENERAL");
  const hasReturnInspection = inspections.some((item) => item.stay_id === room.stay_id && item.room_id === room.id && item.kind === "DEVOLUCION");
  const [phase, setPhase] = useState<"GENERAL" | "ENTREGA" | "DEVOLUCION">(hasReturnInspection || room.status !== "OCUPADA" ? "DEVOLUCION" : "ENTREGA");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const names = inventory.map((item) => item.name.toLowerCase()).join(" ");
  const required = ["VISTA_GENERAL", "BANO", ...( /(cama|almohada|sábana|sabana|cubrecama)/.test(names) ? ["CAMA"] : [] ), ...( /(mesa|cómoda|comoda|silla|poltrona|mueble)/.test(names) ? ["MUEBLES"] : [] ), ...( /televisi/.test(names) ? ["TELEVISION"] : [] ), ...( /ventilador/.test(names) ? ["VENTILADOR"] : [] )];
  const roomDocuments = documents.filter((document) => document.room_id === room.id && (!room.stay_id || document.stay_id === room.stay_id || !document.stay_id));
  const completed = required.filter((item) => roomDocuments.some((document) => document.category === item && (document.phase === phase || document.phase === "GENERAL")));
  const options = [...required, "DANOS", "OTRA_EVIDENCIA", ...(phase === "ENTREGA" ? ["ACTA_ENTREGA_FIRMADA", "CONTRATO"] : phase === "DEVOLUCION" ? ["ACTA_DEVOLUCION_FIRMADA"] : ["CONTRATO"])];
  const upload = async () => {
    if (!file) return;
    setUploading(true); setMessage("");
    const form = new FormData(); form.set("file", file); form.set("roomId", String(room.id)); if (room.stay_id) form.set("stayId", String(room.stay_id)); form.set("phase", phase); form.set("category", category);
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
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Nuevo ingreso</p><h2>Habitación {room.number}</h2><p>Registra al titular y a todas las personas que ocuparán la habitación.</p></div><div className="form-section"><h3>Huésped titular</h3><div className="form-grid"><label className="span-2">Nombre completo<input required autoFocus placeholder="Nombres y apellidos" value={primary.fullName} onChange={(event) => setPrimary({ ...primary, fullName: event.target.value })} /></label><label>CI o documento<div className="lookup-field"><input placeholder="Ej. 7654321" value={primary.ci} disabled={identificationPending} onChange={(event) => setPrimary({ ...primary, ci: event.target.value })} onBlur={lookup} /><button type="button" disabled={!primary.ci || identificationPending} onClick={lookup}>Buscar</button></div></label><label>Celular / WhatsApp<input placeholder="Ej. 70000000" value={primary.phone} onChange={(event) => setPrimary({ ...primary, phone: event.target.value })} /></label><label className="pending-check"><input type="checkbox" checked={identificationPending} onChange={(event) => { setIdentificationPending(event.target.checked); if (event.target.checked) setPrimary({ ...primary, ci: "" }); }} /> Identificación pendiente</label>{lookupMessage && <p className="lookup-message">{lookupMessage}</p>}<label>Tipo de estadía<select name="stayType"><option value="DIA">Por día</option><option value="SEMANA">Por semana</option><option value="MES">Por mes</option><option value="ARRENDAMIENTO">Arrendamiento</option></select></label><label>Salida prevista<input name="expectedCheckOut" type="date" /></label><label className="span-2">Observaciones<textarea name="notes" placeholder="Condiciones especiales, referencias u observaciones…" /></label></div></div><div className="form-section"><div className="section-line"><h3>Acompañantes ({companions.length})</h3><button type="button" className="text-button" onClick={() => setCompanions([...companions, { fullName: "", ci: "", phone: "", isMinor: false }])}>＋ Añadir persona</button></div>{companions.map((companion, index) => <div className="companion-row" key={index}><input aria-label="Nombre del acompañante" placeholder="Nombre completo" value={companion.fullName} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))} /><input aria-label="CI del acompañante" placeholder="CI (opcional)" value={companion.ci} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, ci: e.target.value } : item))} /><label className="minor-check"><input type="checkbox" checked={companion.isMinor} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, isMinor: e.target.checked } : item))} /> Menor</label><button type="button" onClick={() => setCompanions(companions.filter((_, i) => i !== index))}>×</button></div>)}{!companions.length && <p className="empty-inline">No hay acompañantes registrados.</p>}{overCapacity && <div className="capacity-warning"><b>Capacidad excedida: {occupantCount} personas para {room.capacity} plazas.</b>{canAuthorize ? <><label><input type="checkbox" checked={capacityOverride} onChange={(event) => setCapacityOverride(event.target.checked)} /> Autorizar excepcionalmente</label>{capacityOverride && <textarea name="capacityOverrideReason" required placeholder="Motivo de la autorización…" />}</> : <p>Debe realizar el ingreso un propietario o administrador.</p>}</div>}</div><div className="form-actions"><span>Se creará el acta de entrega después del ingreso.</span><button className="primary" disabled={busy || (overCapacity && (!canAuthorize || !capacityOverride))}>{busy ? "Guardando…" : "Confirmar ingreso"}</button></div></form>;
}

function EventForm({ room, busy, onSubmit }: { room: Room; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const type = String(form.get("type")); const roomStatus = type === "LIMPIEZA" ? "LIMPIEZA" : type === "MANTENIMIENTO" ? "MANTENIMIENTO" : undefined; onSubmit({ type, title: form.get("title"), detail: form.get("detail"), status: form.get("status"), roomStatus }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Bitácora · Habitación {room.number}</p><h2>Registrar evento</h2></div><div className="form-grid one"><label>Tipo<select name="type"><option value="LIMPIEZA">Limpieza</option><option value="MANTENIMIENTO">Mantenimiento o reparación</option><option value="MUEBLES">Traslado o acomodo de muebles</option><option value="INSPECCION">Inspección</option><option value="DANO">Reporte de daño</option><option value="OTRO">Otro</option></select></label><label>Título<input name="title" required placeholder="Ej. Reparar ducha del baño" /></label><label>Estado<select name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="COMPLETADO">Completado</option></select></label><label>Detalle<textarea name="detail" placeholder="Describe el trabajo, daño o resultado…" /></label></div><div className="form-actions"><span>El evento quedará en el historial permanente.</span><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar evento"}</button></div></form>;
}

function Transfer({ room, rooms, busy, onSubmit }: { room: Room; rooms: Room[]; busy: boolean; onSubmit: (id: number) => void }) { const [destination, setDestination] = useState(""); return <div><div className="form-title"><p className="eyebrow">Cambio de habitación</p><h2>Trasladar desde la {room.number}</h2><p>Se registrará una devolución de la habitación actual y una nueva entrega.</p></div><label className="standalone-label">Habitación de destino<select value={destination} onChange={(e) => setDestination(e.target.value)}><option value="">Seleccionar habitación disponible</option>{rooms.filter((item) => item.status === "DISPONIBLE").map((item) => <option key={item.id} value={item.id}>Habitación {item.number} · {item.type}</option>)}</select></label><div className="callout">Antes del traslado, imprime el acta de devolución de la habitación {room.number}. Después podrás imprimir el acta de entrega de la nueva habitación.</div><div className="form-actions"><span /></div><button className="primary full-button" disabled={!destination || busy} onClick={() => onSubmit(Number(destination))}>{busy ? "Trasladando…" : "Confirmar cambio"}</button></div>; }

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
