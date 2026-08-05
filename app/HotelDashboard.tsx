"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Floor = { id: number; name: string; position: number };
type Room = { id: number; floor_id: number; number: string; type: string; capacity: number; status: string; notes: string; stay_id?: number; stay_type?: string; check_in?: string; expected_check_out?: string; guest_name?: string; guest_ci?: string; guest_count?: number };
type HotelEvent = { id: number; room_id: number; room_number: string; type: string; title: string; detail: string; status: string; created_by: string; created_at: string };
type InventoryItem = { id: number; room_id: number; name: string; quantity: number; notes: string };
type Inspection = { id: number; stay_id: number; room_id: number; kind: "ENTREGA" | "DEVOLUCION"; notes: string; created_by: string; created_at: string };
type InspectionItem = { id: number; inspection_id: number; inventory_item_id?: number; name: string; quantity: number; condition: "BUENO" | "OBSERVADO" | "FALTANTE"; notes: string };
type Worker = { id: number; name: string; email: string; role: string; active: number; created_at: string };
type Data = { user: { id: number; name: string; email: string; role: string }; floors: Floor[]; rooms: Room[]; events: HotelEvent[]; inventory: InventoryItem[]; inspections: Inspection[]; inspectionItems: InspectionItem[]; users: Worker[] };
type Companion = { fullName: string; ci: string; phone: string; isMinor: boolean };

const labels: Record<string, string> = {
  DISPONIBLE: "Disponible", OCUPADA: "Ocupada", LIMPIEZA: "En limpieza", MANTENIMIENTO: "Mantenimiento", FUERA_SERVICIO: "Fuera de servicio",
  DIA: "Por día", SEMANA: "Por semana", MES: "Por mes", ARRENDAMIENTO: "Arrendamiento",
  PROPIETARIO: "Propietario", ADMINISTRADOR: "Administrador", RECEPCION: "Recepción",
};

const statusOrder = ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"];

export default function HotelDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | "all">("all");
  const [selected, setSelected] = useState<Room | null>(null);
  const [modal, setModal] = useState<"room" | "checkin" | "event" | "transfer" | "edit" | "inventory" | "inspection" | "print" | null>(null);
  const [inspectionKind, setInspectionKind] = useState<"ENTREGA" | "DEVOLUCION">("ENTREGA");
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

  const visibleRooms = useMemo(() => data?.rooms.filter((room) => activeFloor === "all" || room.floor_id === activeFloor) || [], [data, activeFloor]);
  const counts = useMemo(() => Object.fromEntries(statusOrder.map((status) => [status, data?.rooms.filter((room) => room.status === status).length || 0])), [data]);

  const openRoom = (room: Room) => { setSelected(room); setModal("room"); };

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

        {view === "habitaciones" && <>
          <section className="summary-grid">
            <article className="summary hero-summary"><span className="summary-icon">⌂</span><div><small>Ocupación actual</small><strong>{counts.OCUPADA}<em> / {data.rooms.length}</em></strong><p>{Math.round((counts.OCUPADA / data.rooms.length) * 100)}% de las habitaciones</p></div></article>
            {statusOrder.slice(0, 4).map((status) => <article className={`summary tone-${status.toLowerCase()}`} key={status}><small>{labels[status]}</small><strong>{counts[status]}</strong><i /></article>)}
          </section>

          <section className="panel room-panel">
            <div className="panel-head"><div><h2>Habitaciones</h2><p>Selecciona una habitación para ver su estadía y realizar acciones.</p></div><div className="floor-tabs"><button className={activeFloor === "all" ? "active" : ""} onClick={() => setActiveFloor("all")}>Todas</button>{data.floors.map((floor) => <button key={floor.id} className={activeFloor === floor.id ? "active" : ""} onClick={() => setActiveFloor(floor.id)}>{floor.name}</button>)}</div></div>
            <div className="room-grid">{visibleRooms.map((room) => <button key={room.id} className={`room-card status-${room.status.toLowerCase()}`} onClick={() => openRoom(room)}>
              <div className="room-top"><span className="room-number">{room.number}</span><span className="status-pill"><i />{labels[room.status]}</span></div>
              <div className="room-main">{room.guest_name ? <><strong>{room.guest_name}</strong><p>{labels[room.stay_type || ""]} · {room.guest_count || 1} {(room.guest_count || 1) === 1 ? "huésped" : "huéspedes"}</p></> : <><strong>{room.type}</strong><p>Capacidad: {room.capacity} personas</p></>}</div>
              <div className="room-foot"><span>{data.floors.find((floor) => floor.id === room.floor_id)?.name}</span><span>Ver detalle →</span></div>
            </button>)}</div>
          </section>

          <section className="panel recent"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados por el personal.</p></div><button className="text-button" onClick={() => setView("actividad")}>Ver toda la actividad</button></div><EventList events={data.events.slice(0, 5)} /></section>
        </>}

        {view === "actividad" && <section className="panel activity-page"><div className="panel-head"><div><h2>Bitácora de habitaciones</h2><p>Ingresos, salidas, limpieza, mantenimiento y cambios de habitación.</p></div></div><EventList events={data.events} /></section>}

        {view === "configuracion" && <section className="settings-grid"><article className="panel settings-card"><span>🏨</span><h2>Estructura del hotel</h2><p>Actualmente hay {data.floors.length} pisos y {data.rooms.length} habitaciones. La numeración, características e inventario son editables desde cada habitación.</p><div className="floor-list">{data.floors.map((floor) => <div key={floor.id}><b>{floor.name}</b><span>{data.rooms.filter((room) => room.floor_id === floor.id).length} habitaciones</span></div>)}</div></article><article className="panel settings-card staff-card"><span>👥</span><h2>Personal y accesos</h2><p>{data.user.role === "RECEPCION" ? "Consulta quiénes tienen acceso al sistema." : "Desactiva al personal rotativo sin borrar su historial de actividad."}</p><div className="staff-list">{data.users.map((worker) => <div key={worker.id} className={!worker.active ? "inactive" : ""}><span className="staff-avatar">{worker.name.slice(0, 1)}</span><div><b>{worker.name}</b><small>{worker.email}</small></div><select value={worker.role} disabled={worker.id === data.user.id || data.user.role === "RECEPCION"} onChange={(e) => action({ action: "user", userId: worker.id, role: e.target.value, active: Boolean(worker.active) })}><option value="PROPIETARIO">Propietario</option><option value="ADMINISTRADOR">Administrador</option><option value="RECEPCION">Recepción</option></select><button disabled={worker.id === data.user.id || data.user.role === "RECEPCION"} onClick={() => action({ action: "user", userId: worker.id, role: worker.role, active: !worker.active })}>{worker.active ? "Desactivar" : "Reactivar"}</button></div>)}</div></article></section>}
      </section>

      {modal && selected && <Modal onClose={() => setModal(null)} wide={modal === "room" || modal === "print"}>
        {modal === "room" && <RoomDetail room={selected} data={data} onAction={(next) => setModal(next)} onInspection={(kind) => { setInspectionKind(kind); setModal("inspection"); }} onPrint={(kind) => { setInspectionKind(kind); setModal("print"); }} onCheckout={() => action({ action: "checkout", roomId: selected.id })} busy={busy} />}
        {modal === "checkin" && <CheckIn room={selected} rooms={data.rooms} companions={companions} setCompanions={setCompanions} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "checkin", roomId: selected.id, ...payload }); if (result) setCompanions([]); }} />}
        {modal === "event" && <EventForm room={selected} busy={busy} onSubmit={(payload) => action({ action: "event", roomId: selected.id, stayId: selected.stay_id, ...payload })} />}
        {modal === "transfer" && <Transfer room={selected} rooms={data.rooms} busy={busy} onSubmit={(destinationRoomId) => action({ action: "transfer", roomId: selected.id, destinationRoomId })} />}
        {modal === "edit" && <EditRoom room={selected} busy={busy} onSubmit={(payload) => action({ action: "room", roomId: selected.id, ...payload })} />}
        {modal === "inventory" && <InventoryEditor room={selected} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSave={(payload) => action({ action: "inventory", roomId: selected.id, ...payload })} onDelete={(itemId) => action({ action: "inventory_delete", roomId: selected.id, itemId })} />}
        {modal === "inspection" && <InspectionForm room={selected} kind={inspectionKind} items={data.inventory.filter((item) => item.room_id === selected.id)} busy={busy} onSubmit={async (payload) => { const result = await action({ action: "inspection", roomId: selected.id, stayId: selected.stay_id, kind: inspectionKind, ...payload }); if (result) { setInspectionKind(inspectionKind); setModal("print"); } }} />}
        {modal === "print" && <DeliveryAct room={selected} kind={inspectionKind} inspection={data.inspections.find((item) => item.stay_id === selected.stay_id && item.kind === inspectionKind)} items={data.inspectionItems} fallbackItems={data.inventory.filter((item) => item.room_id === selected.id)} onPrint={() => window.print()} />}
      </Modal>}
    </main>
  );
}

function EventList({ events }: { events: HotelEvent[] }) {
  return <div className="event-list">{events.length ? events.map((event) => <article key={event.id}><span className={`event-icon event-${event.type.toLowerCase()}`}>{event.type === "INGRESO" ? "↘" : event.type === "SALIDA" ? "↗" : event.type === "LIMPIEZA" ? "✦" : event.type === "MANTENIMIENTO" ? "⌁" : "↔"}</span><div><strong>{event.title}</strong><p>Habitación {event.room_number} · {event.detail || "Sin observaciones"}</p></div><aside><b>{new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.created_at))}</b><small>{event.created_by}</small></aside></article>) : <p className="empty">Aún no existen movimientos registrados.</p>}</div>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? "modal-wide" : ""}`}><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>{children}</section></div>;
}

function RoomDetail({ room, data, onAction, onInspection, onPrint, onCheckout, busy }: { room: Room; data: Data; onAction: (modal: "checkin" | "event" | "transfer" | "edit" | "inventory") => void; onInspection: (kind: "ENTREGA" | "DEVOLUCION") => void; onPrint: (kind: "ENTREGA" | "DEVOLUCION") => void; onCheckout: () => void; busy: boolean }) {
  const [category, setCategory] = useState("CONTRATO"); const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false);
  const upload = async () => { if (!file) return; setUploading(true); const form = new FormData(); form.set("file", file); form.set("roomId", String(room.id)); if (room.stay_id) form.set("stayId", String(room.stay_id)); form.set("category", category); await fetch("/api/documents", { method: "POST", body: form }); setUploading(false); setFile(null); };
  return <><div className="detail-title"><div><p className="eyebrow">{data.floors.find((floor) => floor.id === room.floor_id)?.name}</p><h2>Habitación {room.number}</h2></div><span className={`big-status status-${room.status.toLowerCase()}`}>{labels[room.status]}</span></div>
    <div className="detail-grid"><div className="detail-main"><section className="info-box"><h3>{room.guest_name ? "Estadía activa" : "Información de habitación"}</h3>{room.guest_name ? <div className="guest-profile"><span>{room.guest_name.slice(0, 1)}</span><div><b>{room.guest_name}</b><p>CI {room.guest_ci || "no registrado"} · {room.guest_count || 1} personas</p><small>Ingreso: {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(room.check_in!))}</small></div></div> : <div className="room-facts"><div><small>Tipo</small><b>{room.type}</b></div><div><small>Capacidad</small><b>{room.capacity} personas</b></div><div><small>Estado</small><b>{labels[room.status]}</b></div></div>}</section>
      <section className="info-box"><h3>Documentos y evidencias</h3><p className="help">Sube contratos, actas firmadas o fotografías de la habitación.</p><div className="upload-row"><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="CONTRATO">Contrato</option><option value="ACTA_ENTREGA_FIRMADA">Acta de entrega firmada</option><option value="ACTA_DEVOLUCION_FIRMADA">Acta de devolución firmada</option><option value="FOTO_INGRESO">Fotos de ingreso</option><option value="FOTO_SALIDA">Fotos de salida</option></select><label className="file-picker">{file ? file.name : "Elegir archivo"}<input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button disabled={!file || uploading} onClick={upload}>{uploading ? "Subiendo…" : "Guardar"}</button></div></section></div>
      <aside className="action-stack"><h3>Acciones</h3>{room.status === "DISPONIBLE" && <button className="primary" onClick={() => onAction("checkin")}>Registrar ingreso</button>}{room.status === "OCUPADA" && <><button onClick={() => onInspection("ENTREGA")}>Completar acta de entrega</button><button onClick={() => onPrint("ENTREGA")}>Imprimir última entrega</button><button onClick={() => onInspection("DEVOLUCION")}>Completar acta de devolución</button><button onClick={() => onPrint("DEVOLUCION")}>Imprimir última devolución</button><button onClick={() => onAction("transfer")}>Cambiar habitación</button><button className="danger-light" disabled={busy} onClick={onCheckout}>Registrar salida</button></>}<button onClick={() => onAction("event")}>Añadir evento</button>{data.user.role !== "RECEPCION" && <><button onClick={() => onAction("inventory")}>Editar inventario</button><button onClick={() => onAction("edit")}>Editar habitación</button></>}</aside></div></>;
}

function CheckIn({ room, companions, setCompanions, busy, onSubmit }: { room: Room; rooms: Room[]; companions: Companion[]; setCompanions: (value: Companion[]) => void; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ primary: { fullName: form.get("fullName"), ci: form.get("ci"), phone: form.get("phone") }, stayType: form.get("stayType"), expectedCheckOut: form.get("expectedCheckOut") || null, notes: form.get("notes"), companions }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Nuevo ingreso</p><h2>Habitación {room.number}</h2><p>Registra al titular y a todas las personas que ocuparán la habitación.</p></div><div className="form-section"><h3>Huésped titular</h3><div className="form-grid"><label className="span-2">Nombre completo<input name="fullName" required autoFocus placeholder="Nombres y apellidos" /></label><label>CI o documento<input name="ci" placeholder="Ej. 7654321" /></label><label>Celular / WhatsApp<input name="phone" placeholder="Ej. 70000000" /></label><label>Tipo de estadía<select name="stayType"><option value="DIA">Por día</option><option value="SEMANA">Por semana</option><option value="MES">Por mes</option><option value="ARRENDAMIENTO">Arrendamiento</option></select></label><label>Salida prevista<input name="expectedCheckOut" type="date" /></label><label className="span-2">Observaciones<textarea name="notes" placeholder="Condiciones especiales, referencias u observaciones…" /></label></div></div><div className="form-section"><div className="section-line"><h3>Acompañantes ({companions.length})</h3><button type="button" className="text-button" onClick={() => setCompanions([...companions, { fullName: "", ci: "", phone: "", isMinor: false }])}>＋ Añadir persona</button></div>{companions.map((companion, index) => <div className="companion-row" key={index}><input aria-label="Nombre del acompañante" placeholder="Nombre completo" value={companion.fullName} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))} /><input aria-label="CI del acompañante" placeholder="CI (opcional)" value={companion.ci} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, ci: e.target.value } : item))} /><label className="minor-check"><input type="checkbox" checked={companion.isMinor} onChange={(e) => setCompanions(companions.map((item, i) => i === index ? { ...item, isMinor: e.target.checked } : item))} /> Menor</label><button type="button" onClick={() => setCompanions(companions.filter((_, i) => i !== index))}>×</button></div>)}{!companions.length && <p className="empty-inline">No hay acompañantes registrados.</p>}</div><div className="form-actions"><span>Se creará el acta de entrega después del ingreso.</span><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Confirmar ingreso"}</button></div></form>;
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

function InspectionForm({ room, kind, items, busy, onSubmit }: { room: Room; kind: "ENTREGA" | "DEVOLUCION"; items: InventoryItem[]; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [checks, setChecks] = useState(items.map((item) => ({ ...item, condition: "BUENO", itemNotes: "" })));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ notes: form.get("notes"), items: checks.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, condition: item.condition, notes: item.itemNotes })) }); };
  return <form onSubmit={submit}><div className="form-title"><p className="eyebrow">Habitación {room.number}</p><h2>Acta de {kind === "ENTREGA" ? "entrega" : "devolución"}</h2><p>Revisa cada elemento antes de generar el documento para firma.</p></div><div className="inspection-list">{checks.map((item, index) => <div key={item.id}><span><b>{item.quantity} × {item.name}</b><small>{item.notes || "Elemento de habitación"}</small></span><select value={item.condition} onChange={(e) => setChecks(checks.map((check, i) => i === index ? { ...check, condition: e.target.value } : check))}><option value="BUENO">Bueno</option><option value="OBSERVADO">Observado</option><option value="FALTANTE">Faltante</option></select><input placeholder="Observación" value={item.itemNotes} onChange={(e) => setChecks(checks.map((check, i) => i === index ? { ...check, itemNotes: e.target.value } : check))} /></div>)}</div><label className="standalone-label inspection-notes">Observaciones generales<textarea name="notes" placeholder="Daños previos, detalles de devolución o acuerdos…" /></label><div className="form-actions"><span>Al guardar se abrirá el documento para imprimir.</span><button className="primary" disabled={busy}>{busy ? "Generando…" : "Guardar y generar acta"}</button></div></form>;
}

function DeliveryAct({ room, kind, inspection, items, fallbackItems, onPrint }: { room: Room; kind: "ENTREGA" | "DEVOLUCION"; inspection?: Inspection; items: InspectionItem[]; fallbackItems: InventoryItem[]; onPrint: () => void }) {
  const actItems = inspection ? items.filter((item) => item.inspection_id === inspection.id) : fallbackItems.map((item) => ({ id: item.id, inspection_id: 0, name: item.name, quantity: item.quantity, condition: "BUENO" as const, notes: "" }));
  return <div className="print-wrapper"><div className="print-toolbar"><div><p className="eyebrow">{inspection ? "Documento guardado" : "Plantilla preliminar"}</p><h2>Acta de {kind === "ENTREGA" ? "entrega" : "devolución"}</h2></div><button className="primary" onClick={onPrint}>Imprimir acta</button></div><article className="acta"><header><span className="brand-mark">A</span><div><h2>HOTEL ASAEL</h2><p>ACTA DE {kind === "ENTREGA" ? "ENTREGA" : "DEVOLUCIÓN"} DE HABITACIÓN</p></div><b>Habitación {room.number}</b></header><section className="acta-meta"><div><small>Huésped titular</small><strong>{room.guest_name}</strong></div><div><small>CI</small><strong>{room.guest_ci || "________________"}</strong></div><div><small>Fecha</small><strong>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(inspection ? new Date(inspection.created_at) : new Date())}</strong></div><div><small>Tipo de estadía</small><strong>{labels[room.stay_type || ""]}</strong></div></section><p>Las partes dejan constancia del estado de la habitación y de los elementos detallados a continuación:</p><table><thead><tr><th>Elemento verificado</th><th>Cantidad</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>{actItems.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{item.condition === "BUENO" ? "Bueno" : item.condition === "OBSERVADO" ? "Observado" : "Faltante"}</td><td>{item.notes}</td></tr>)}</tbody></table><div className="acta-notes"><b>Observaciones generales:</b> {inspection?.notes || ""}</div><footer><div><span /><b>Firma del huésped</b><small>Nombre y CI</small></div><div><span /><b>Firma del encargado</b><small>{inspection?.created_by || "Hotel ASAEL"}</small></div></footer></article></div>;
}
