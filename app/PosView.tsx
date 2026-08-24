"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = { id: number; sku: string; name: string; category: string; sale_unit: string; sale_price_cents: number; reception_stock: number; active: number };
type ActiveStay = { id: number; room_id: number; room_number: string; primary_guest_id: number; primary_guest_name: string };
type Occupant = { stay_id: number; id: number; full_name: string; is_primary: number };
type Sale = { id: number; sale_number: string; sale_type: "HUESPED" | "DIRECTA"; stay_id?: number; room_number?: string; customer_name?: string; status: "PAGADA" | "PENDIENTE" | "ANULADA" | "DEVUELTA"; payment_method: string; cash_session_id?: number; total_cents: number; paid_cents: number; returned_cents: number; balance_cents: number; print_count: number; created_by_name: string; created_at: string; cancellation_reason?: string };
type SaleItem = { id: number; sale_id: number; product_id: number; product_name: string; quantity: number; returned_quantity: number; unit_price_cents: number };
type CashSession = { id: number; status: "ABIERTA" | "CERRADA" | "PENDIENTE_REVISION" | "REVISADA"; opened_by_name: string; opened_at: string; opening_cash_cents: number; cash_income_cents?: number; cash_refund_cents?: number; sale_count?: number; closed_by_name?: string; closed_at?: string; expected_cash_cents?: number; counted_cash_cents?: number; difference_cents?: number; difference_reason?: string; reviewed_by_name?: string; review_note?: string };
type ReportData = { periods: Array<{ period: string; net_sales_cents: number; sale_count: number }>; products: Array<{ product_id: number; product_name: string; units: number; revenue_cents: number; cost_cents: number }>; workers: Array<{ created_by_name: string; sale_count: number; sales_cents: number }>; paymentMethods: Array<{ payment_method: string; payment_count: number; amount_cents: number }> };
type PosData = { user: { id: number; name: string; role: string }; products: Product[]; activeStays: ActiveStay[]; occupants: Occupant[]; recentSales: Sale[]; pendingByStay: Array<{ stay_id: number; sale_count: number; pending_cents: number }>; pendingLimitCents: number; currentCashSession?: CashSession; cashSessions: CashSession[]; saleItems: SaleItem[]; payments: Array<Record<string, unknown>>; returns: Array<Record<string, unknown>>; reports: ReportData };

const paymentLabels: Record<string, string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", QR: "QR", PENDIENTE: "Cargo pendiente", CORTESIA: "Cortesía", OTRO: "Otro" };
const saleStatusLabels: Record<string, string> = { PAGADA: "Pagada", PENDIENTE: "Pendiente", ANULADA: "Anulada", DEVUELTA: "Devuelta" };
const money = (cents: number) => `Bs ${(Number(cents || 0) / 100).toFixed(2)}`;

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) throw new Error("El servidor no respondió. Intenta nuevamente.");
  try { return JSON.parse(text); } catch { throw new Error("El servidor devolvió una respuesta inválida."); }
}

export default function PosView() {
  const [data, setData] = useState<PosData | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [saleType, setSaleType] = useState<"HUESPED" | "DIRECTA">("HUESPED");
  const [stayId, setStayId] = useState("");
  const [consumerGuestId, setConsumerGuestId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [paymentReference, setPaymentReference] = useState("");
  const [pendingOverride, setPendingOverride] = useState(false);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastSale, setLastSale] = useState<{ saleNumber: string; receiptUrl: string } | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/store", { cache: "no-store" });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || "No se pudo cargar el punto de venta.");
    setData(result);
    setStayId((current) => current || String(result.activeStays[0]?.id || ""));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const availableProducts = useMemo(() => (data?.products || []).filter((product) => Boolean(product.active) && Number(product.reception_stock) > 0 && `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [data, search]);
  const cartItems = useMemo(() => Object.entries(cart).map(([id, quantity]) => ({ product: data?.products.find((item) => item.id === Number(id)), quantity })).filter((item): item is { product: Product; quantity: number } => Boolean(item.product && item.quantity)), [cart, data]);
  const totalCents = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.product.sale_price_cents), 0);
  const selectedStay = data?.activeStays.find((stay) => stay.id === Number(stayId));
  const stayOccupants = data?.occupants.filter((occupant) => occupant.stay_id === Number(stayId)) || [];
  const currentPending = Number(data?.pendingByStay.find((pending) => pending.stay_id === Number(stayId))?.pending_cents || 0);
  const exceedsPendingLimit = paymentMethod === "PENDIENTE" && currentPending + totalCents > Number(data?.pendingLimitCents || 20000);
  const isAdmin = data?.user.role === "PROPIETARIO" || data?.user.role === "ADMINISTRADOR";
  const selectedSale = data?.recentSales.find((sale) => sale.id === selectedSaleId);

  const changeQuantity = (product: Product, next: number) => setCart((current) => {
    const quantity = Math.max(0, Math.min(Math.floor(next), Number(product.reception_stock)));
    const updated = { ...current };
    if (quantity) updated[product.id] = quantity; else delete updated[product.id];
    return updated;
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setNotice(""); setLastSale(null);
    try {
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sale_create", saleType, stayId: Number(stayId), consumerGuestId: Number(consumerGuestId) || undefined, customerName, paymentMethod, paymentReference, pendingOverride, notes, items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "No se pudo registrar la venta.");
      setCart({}); setNotes(""); setCustomerName(""); setPaymentReference(""); setPendingOverride(false);
      setLastSale({ saleNumber: result.saleNumber, receiptUrl: result.receiptUrl });
      setNotice(`${result.saleNumber} registrada por ${money(result.totalCents)}.`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo registrar la venta."); }
    finally { setBusy(false); }
  };

  const cancelSale = async (sale: Sale) => {
    const reason = window.prompt(`Motivo obligatorio para anular ${sale.sale_number}:`);
    if (!reason?.trim()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sale_cancel", saleId: sale.id, reason }) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "No se pudo anular la venta.");
      setNotice("Venta anulada. El stock no fue devuelto automáticamente y quedó registrado como evidencia.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo anular la venta."); }
    finally { setBusy(false); }
  };

  if (!data) return <section className="pos-loading"><article className="panel"><h2>Preparando el punto de venta…</h2>{notice && <p>{notice}</p>}</article></section>;

  return <section className="pos-page">
    <header className="pos-hero"><div><p className="eyebrow">Mini POS · Hotel ASAEL</p><h2>Ventas a huéspedes y público</h2><p>Todo despacho descuenta existencias del stock de recepción.</p></div><div><span>Stock disponible</span><b>{data.products.reduce((sum, product) => sum + Number(product.reception_stock || 0), 0)} unidades</b><small>{availableProducts.length} productos visibles</small></div></header>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {lastSale && <article className="panel pos-success"><div><span>✓</span><div><b>{lastSale.saleNumber} lista</b><small>El comprobante puede imprimirse ahora o desde el historial.</small></div></div><a className="primary" href={lastSale.receiptUrl} target="_blank" rel="noreferrer">Imprimir comprobante</a></article>}

    <CashControl data={data} onReload={load} onNotice={setNotice} />

    <div className="pos-workspace">
      <section className="panel pos-products"><div className="panel-head"><div><h2>Productos</h2><p>Precio único, sin modificación desde recepción.</p></div><label className="pos-search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto…" /></label></div><div className="pos-product-grid">{availableProducts.map((product) => <article key={product.id}><div><span>{product.category}</span><h3>{product.name}</h3><small>{product.sku} · {product.reception_stock} {product.sale_unit}</small></div><strong>{money(product.sale_price_cents)}</strong><button onClick={() => changeQuantity(product, (cart[product.id] || 0) + 1)}>＋ Agregar</button></article>)}{!availableProducts.length && <p className="pos-empty">No hay productos con stock de recepción para esta búsqueda.</p>}</div></section>

      <form className="panel pos-cart" onSubmit={submit}><div className="pos-cart-title"><div><span>Venta actual</span><h2>{cartItems.length} producto(s)</h2></div><strong>{money(totalCents)}</strong></div><div className="pos-cart-lines">{cartItems.map(({ product, quantity }) => <div key={product.id}><div><b>{product.name}</b><small>{money(product.sale_price_cents)} c/u</small></div><div className="quantity-control"><button type="button" onClick={() => changeQuantity(product, quantity - 1)}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product, quantity + 1)}>＋</button></div><strong>{money(quantity * product.sale_price_cents)}</strong></div>)}{!cartItems.length && <p className="pos-empty">Agrega productos para iniciar la venta.</p>}</div>
        <div className="pos-target-tabs"><button type="button" className={saleType === "HUESPED" ? "active" : ""} onClick={() => setSaleType("HUESPED")}>Cargo a huésped</button><button type="button" className={saleType === "DIRECTA" ? "active" : ""} onClick={() => { setSaleType("DIRECTA"); if (paymentMethod === "PENDIENTE") setPaymentMethod("EFECTIVO"); }}>Venta directa</button></div>
        {saleType === "HUESPED" ? <div className="pos-fields"><label>Estadía activa<select required value={stayId} onChange={(event) => { setStayId(event.target.value); setConsumerGuestId(""); }}><option value="">Seleccionar…</option>{data.activeStays.map((stay) => <option value={stay.id} key={stay.id}>Hab. {stay.room_number} · {stay.primary_guest_name}</option>)}</select></label><label>Consumidor dentro de la estadía<select value={consumerGuestId} onChange={(event) => setConsumerGuestId(event.target.value)}><option value="">Titular responsable</option>{stayOccupants.map((occupant) => <option value={occupant.id} key={occupant.id}>{occupant.full_name}{occupant.is_primary ? " · Titular" : ""}</option>)}</select></label>{selectedStay && <p className="pos-stay-note"><b>Responsable:</b> {selectedStay.primary_guest_name} · Habitación {selectedStay.room_number}<br /><b>Pendiente actual:</b> {money(currentPending)}</p>}</div> : <div className="pos-fields"><label>Nombre del cliente (opcional)<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Consumidor final" /></label></div>}
        <div className="pos-fields"><label>Forma de pago<select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setPendingOverride(false); }}><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="QR">QR</option>{saleType === "HUESPED" && <option value="PENDIENTE">Cargo pendiente</option>}{isAdmin && <option value="CORTESIA">Cortesía autorizada</option>}<option value="OTRO">Otro</option></select></label>{["TRANSFERENCIA", "QR", "OTRO"].includes(paymentMethod) && <label>Referencia del pago digital<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="N.º de operación o respaldo" /></label>}<label>Observaciones<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Referencia o detalle opcional…" /></label></div>
        {paymentMethod === "PENDIENTE" && <div className={exceedsPendingLimit ? "pos-pending warning" : "pos-pending"}><span>Saldo resultante</span><b>{money(currentPending + totalCents)} / {money(data.pendingLimitCents)}</b>{exceedsPendingLimit && (isAdmin ? <label><input type="checkbox" checked={pendingOverride} onChange={(event) => setPendingOverride(event.target.checked)} /> Autorizar excepción administrativa</label> : <small>Solicita autorización administrativa para superar el límite.</small>)}</div>}
        {!data.currentCashSession && <p className="pos-cash-required">Debes abrir la caja compartida antes de vender.</p>}<button className="primary pos-confirm" disabled={busy || !data.currentCashSession || !cartItems.length || (saleType === "HUESPED" && !stayId) || (exceedsPendingLimit && !pendingOverride)}>{busy ? "Registrando…" : `Confirmar venta · ${money(totalCents)}`}</button>
      </form>
    </div>

    {selectedSale && <SaleOperations sale={selectedSale} items={data.saleItems.filter((item) => item.sale_id === selectedSale.id)} cashOpen={Boolean(data.currentCashSession)} onClose={() => setSelectedSaleId(null)} onReload={load} onNotice={setNotice} />}

    <section className="panel pos-history"><div className="panel-head"><div><h2>Ventas recientes</h2><p>Comprobantes, saldos, cobros parciales y devoluciones visibles.</p></div><span>{data.recentSales.length} registros</span></div><div className="pos-sales-table"><table><thead><tr><th>Número</th><th>Destino</th><th>Pago</th><th>Estado</th><th>Total / saldo</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{data.recentSales.map((sale) => <tr key={sale.id} className={sale.status === "ANULADA" ? "cancelled" : ""}><td><b>{sale.sale_number}</b><small>{new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" }).format(new Date(sale.created_at))}</small></td><td>{sale.sale_type === "HUESPED" ? `Hab. ${sale.room_number}` : sale.customer_name || "Venta directa"}</td><td>{paymentLabels[sale.payment_method] || sale.payment_method}<small>Pagado {money(sale.paid_cents)}</small></td><td><span className={`sale-status ${sale.status.toLowerCase()}`}>{saleStatusLabels[sale.status] || sale.status}</span>{sale.cancellation_reason && <small>{sale.cancellation_reason}</small>}</td><td><b>{money(sale.total_cents)}</b><small>Saldo {money(sale.balance_cents)}</small></td><td>{sale.created_by_name}</td><td><div className="sale-actions"><a href={`/api/store?receipt=${encodeURIComponent(sale.sale_number)}`} target="_blank" rel="noreferrer">{sale.print_count ? "Reimprimir" : "Imprimir"}</a>{!["ANULADA", "DEVUELTA"].includes(sale.status) && <button onClick={() => setSelectedSaleId(sale.id)}>Cobrar / devolver</button>}{sale.status !== "ANULADA" && <button disabled={busy} onClick={() => cancelSale(sale)}>Anular</button>}</div></td></tr>)}</tbody></table></div></section>
    {isAdmin && <CommercialReports reports={data.reports} />}
  </section>;
}

function CashControl({ data, onReload, onNotice }: { data: PosData; onReload: () => Promise<void>; onNotice: (message: string) => void }) {
  const [opening, setOpening] = useState("0");
  const [counted, setCounted] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const session = data.currentCashSession;
  const expected = session ? Number(session.opening_cash_cents) + Number(session.cash_income_cents || 0) - Number(session.cash_refund_cents || 0) : 0;
  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la caja.");
      await onReload(); return result;
    } finally { setBusy(false); }
  };
  const open = async (event: FormEvent) => { event.preventDefault(); try { await post({ action: "cash_open", openingCashCents: Math.round(Number(opening) * 100), notes }); setNotes(""); onNotice("Caja compartida abierta. Ya se pueden registrar ventas."); } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo abrir la caja."); } };
  const close = async (event: FormEvent) => { event.preventDefault(); try { const result = await post({ action: "cash_close", countedCashCents: Math.round(Number(counted) * 100), differenceReason, notes }); setCounted(""); setDifferenceReason(""); setNotes(""); onNotice(result.differenceCents ? `Caja cerrada con diferencia de ${money(result.differenceCents)} pendiente de revisión.` : "Caja cerrada y conciliada correctamente."); } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo cerrar la caja."); } };
  const review = async (cash: CashSession) => { const reviewNote = window.prompt("Conclusión obligatoria de la revisión administrativa:"); if (!reviewNote?.trim()) return; try { await post({ action: "cash_review", sessionId: cash.id, reviewNote }); onNotice("Diferencia de caja revisada y cerrada administrativamente."); } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo revisar la caja."); } };
  const pendingReviews = data.cashSessions.filter((cash) => cash.status === "PENDIENTE_REVISION");
  return <section className="cash-area">
    <article className={session ? "panel cash-card open" : "panel cash-card closed"}><header><div><span>{session ? "Turno en operación" : "Caja cerrada"}</span><h2>{session ? `Caja #${session.id} abierta` : "Abrir caja de recepción"}</h2></div><em>{session ? "ABIERTA" : "SIN TURNO"}</em></header>{session ? <><div className="cash-metrics"><span><small>Inicial</small><b>{money(session.opening_cash_cents)}</b></span><span><small>Ingresos efectivo</small><b>{money(session.cash_income_cents || 0)}</b></span><span><small>Reembolsos</small><b>{money(session.cash_refund_cents || 0)}</b></span><span><small>Esperado ahora</small><b>{money(expected)}</b></span></div><p>Abierta por <b>{session.opened_by_name}</b> · {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.opened_at))} · {session.sale_count || 0} ventas</p></> : <p>La caja compartida conserva la entrega formal entre turnos y el responsable de cada operación.</p>}</article>
    <form className="panel cash-form" onSubmit={session ? close : open}><h3>{session ? "Cerrar y entregar turno" : "Iniciar turno"}</h3>{session ? <><label>Efectivo contado<input type="number" min="0" step="0.01" value={counted} onChange={(event) => setCounted(event.target.value)} required placeholder="0.00" /></label><label>Motivo si existe diferencia<input value={differenceReason} onChange={(event) => setDifferenceReason(event.target.value)} placeholder="Faltante, sobrante o aclaración…" /></label></> : <label>Monto inicial en efectivo<input type="number" min="0" step="0.01" value={opening} onChange={(event) => setOpening(event.target.value)} required /></label>}<label>Observaciones<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Entrega, billetes o detalle opcional…" /></label><button className={session ? "danger-light" : "primary"} disabled={busy}>{busy ? "Guardando…" : session ? "Cerrar caja" : "Abrir caja"}</button></form>
    {pendingReviews.length > 0 && <article className="panel cash-reviews"><h3>Diferencias por revisar</h3>{pendingReviews.map((cash) => <div key={cash.id}><span><b>Caja #{cash.id}</b><small>{cash.closed_by_name} · {money(cash.difference_cents || 0)}</small></span>{data.user.role !== "RECEPCION" ? <button onClick={() => review(cash)}>Revisar</button> : <em>Administración</em>}</div>)}</article>}
  </section>;
}

function SaleOperations({ sale, items, cashOpen, onClose, onReload, onNotice }: { sale: Sale; items: SaleItem[]; cashOpen: boolean; onClose: () => void; onReload: () => Promise<void>; onNotice: (message: string) => void }) {
  const [mode, setMode] = useState<"PAYMENT" | "RETURN">(sale.balance_cents > 0 ? "PAYMENT" : "RETURN");
  const [amount, setAmount] = useState((sale.balance_cents / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [reference, setReference] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [responsible, setResponsible] = useState("");
  const [physicalCondition, setPhysicalCondition] = useState("SELLADO");
  const [returnsToStock, setReturnsToStock] = useState(false);
  const [refundMethod, setRefundMethod] = useState(sale.balance_cents > 0 ? "SALDO" : "EFECTIVO");
  const [busy, setBusy] = useState(false);
  const returnValue = items.reduce((sum, item) => sum + Number(quantities[item.id] || 0) * item.unit_price_cents, 0);
  const post = async (payload: Record<string, unknown>) => { setBusy(true); try { const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const result = await readJson(response); if (!response.ok) throw new Error(result.error || "No se pudo completar la operación."); await onReload(); return result; } finally { setBusy(false); } };
  const pay = async (event: FormEvent) => { event.preventDefault(); try { const result = await post({ action: "sale_payment", saleId: sale.id, amountCents: Math.round(Number(amount) * 100), paymentMethod, reference }); onNotice(`Cobro registrado. Saldo restante: ${money(result.balanceCents)}.`); onClose(); } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo registrar el cobro."); } };
  const returnItems = async (event: FormEvent) => { event.preventDefault(); try { const result = await post({ action: "sale_return", saleId: sale.id, reason, responsible, physicalCondition, returnsToStock, refundMethod, items: Object.entries(quantities).map(([saleItemId, quantity]) => ({ saleItemId: Number(saleItemId), quantity })) }); onNotice(`${result.returnNumber} registrada por ${money(result.refundAmountCents)}${result.stockRestored ? " y reintegrada a recepción" : ""}.`); onClose(); } catch (error) { onNotice(error instanceof Error ? error.message : "No se pudo registrar la devolución."); } };
  return <article className="panel sale-operation"><header><div><span>Operación sobre {sale.sale_number}</span><h2>Total {money(sale.total_cents)} · Saldo {money(sale.balance_cents)}</h2></div><button onClick={onClose}>×</button></header><div className="operation-tabs"><button className={mode === "PAYMENT" ? "active" : ""} disabled={!sale.balance_cents} onClick={() => setMode("PAYMENT")}>Registrar cobro</button><button className={mode === "RETURN" ? "active" : ""} onClick={() => setMode("RETURN")}>Devolver productos</button></div>{!cashOpen && <p className="pos-cash-required">Abre la caja para realizar esta operación.</p>}{mode === "PAYMENT" ? <form onSubmit={pay} className="operation-form"><label>Monto a cobrar<input type="number" min="0.01" max={(sale.balance_cents / 100).toFixed(2)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label>Forma de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="QR">QR</option><option value="OTRO">Otro</option></select></label><label>Referencia o evidencia textual<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="N.º operación o detalle opcional" /></label><button className="primary" disabled={busy || !cashOpen}>{busy ? "Registrando…" : `Cobrar ${money(Math.round(Number(amount || 0) * 100))}`}</button></form> : <form onSubmit={returnItems} className="return-form"><div className="return-items">{items.map((item) => { const available = item.quantity - Number(item.returned_quantity || 0); return <label key={item.id}><span><b>{item.product_name}</b><small>Disponible para devolver: {available} · {money(item.unit_price_cents)} c/u</small></span><input type="number" min="0" max={available} value={quantities[item.id] || 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /></label>; })}</div><div className="return-fields"><label>Motivo obligatorio<input value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Cambio, error, producto observado…" /></label><label>Responsable<input value={responsible} onChange={(event) => setResponsible(event.target.value)} required placeholder="Persona que entrega o recibe" /></label><label>Estado físico<select value={physicalCondition} onChange={(event) => { setPhysicalCondition(event.target.value); if (["ABIERTO", "DANADO"].includes(event.target.value)) setReturnsToStock(false); }}><option value="SELLADO">Sellado</option><option value="BUENO">Bueno</option><option value="ABIERTO">Abierto</option><option value="DANADO">Dañado</option></select></label><label>Tratamiento económico<select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}><option value="SALDO">Descontar del saldo</option><option value="EFECTIVO">Reembolso en efectivo</option><option value="TRANSFERENCIA">Reembolso por transferencia</option><option value="QR">Reembolso por QR</option><option value="SIN_REEMBOLSO">Sin reembolso</option><option value="OTRO">Otro</option></select></label><label className="return-stock-check"><input type="checkbox" checked={returnsToStock} disabled={["ABIERTO", "DANADO"].includes(physicalCondition)} onChange={(event) => setReturnsToStock(event.target.checked)} /> Regresar al stock vendible de recepción</label></div><footer><span>Valor seleccionado: <b>{money(returnValue)}</b></span><button className="primary" disabled={busy || !cashOpen || !returnValue}>{busy ? "Registrando…" : "Confirmar devolución"}</button></footer></form>}</article>;
}

function CommercialReports({ reports }: { reports: ReportData }) {
  const maxUnits = Math.max(1, ...reports.products.map((item) => Number(item.units)));
  return <section className="commercial-reports"><div className="panel-head"><div><h2>Resumen comercial</h2><p>Visible únicamente para Administración y Propietario.</p></div></div><div className="report-periods">{reports.periods.map((period) => <article className="panel" key={period.period}><span>{period.period}</span><strong>{money(period.net_sales_cents)}</strong><small>{period.sale_count} ventas netas</small></article>)}</div><div className="report-grid"><article className="panel"><h3>Productos más vendidos y rentabilidad</h3><div className="report-bars">{reports.products.map((product) => <div key={product.product_id}><header><b>{product.product_name}</b><span>{product.units} un. · {money(product.revenue_cents)}</span></header><i><em style={{ width: `${Math.max(4, Number(product.units) / maxUnits * 100)}%` }} /></i><small>Ganancia aproximada: {money(Number(product.revenue_cents) - Number(product.cost_cents))}</small></div>)}{!reports.products.length && <p>Sin ventas todavía.</p>}</div></article><article className="panel"><h3>Ventas por trabajador</h3><div className="report-list">{reports.workers.map((worker) => <div key={worker.created_by_name}><span><b>{worker.created_by_name}</b><small>{worker.sale_count} operaciones</small></span><strong>{money(worker.sales_cents)}</strong></div>)}</div><h3>Formas de pago</h3><div className="report-list">{reports.paymentMethods.map((method) => <div key={method.payment_method}><span><b>{paymentLabels[method.payment_method] || method.payment_method}</b><small>{method.payment_count} cobros</small></span><strong>{money(method.amount_cents)}</strong></div>)}</div></article></div></section>;
}
