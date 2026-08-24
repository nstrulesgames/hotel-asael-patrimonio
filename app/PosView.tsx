"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = { id: number; sku: string; name: string; category: string; sale_unit: string; sale_price_cents: number; reception_stock: number; active: number };
type ActiveStay = { id: number; room_id: number; room_number: string; primary_guest_id: number; primary_guest_name: string };
type Occupant = { stay_id: number; id: number; full_name: string; is_primary: number };
type Sale = { id: number; sale_number: string; sale_type: "HUESPED" | "DIRECTA"; stay_id?: number; room_number?: string; customer_name?: string; status: "PAGADA" | "PENDIENTE" | "ANULADA"; payment_method: string; total_cents: number; print_count: number; created_by_name: string; created_at: string; cancellation_reason?: string };
type PosData = { user: { id: number; name: string; role: string }; products: Product[]; activeStays: ActiveStay[]; occupants: Occupant[]; recentSales: Sale[]; pendingByStay: Array<{ stay_id: number; sale_count: number; pending_cents: number }>; pendingLimitCents: number };

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
  const [pendingOverride, setPendingOverride] = useState(false);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastSale, setLastSale] = useState<{ saleNumber: string; receiptUrl: string } | null>(null);

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
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sale_create", saleType, stayId: Number(stayId), consumerGuestId: Number(consumerGuestId) || undefined, customerName, paymentMethod, pendingOverride, notes, items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "No se pudo registrar la venta.");
      setCart({}); setNotes(""); setCustomerName(""); setPendingOverride(false);
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

    <div className="pos-workspace">
      <section className="panel pos-products"><div className="panel-head"><div><h2>Productos</h2><p>Precio único, sin modificación desde recepción.</p></div><label className="pos-search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto…" /></label></div><div className="pos-product-grid">{availableProducts.map((product) => <article key={product.id}><div><span>{product.category}</span><h3>{product.name}</h3><small>{product.sku} · {product.reception_stock} {product.sale_unit}</small></div><strong>{money(product.sale_price_cents)}</strong><button onClick={() => changeQuantity(product, (cart[product.id] || 0) + 1)}>＋ Agregar</button></article>)}{!availableProducts.length && <p className="pos-empty">No hay productos con stock de recepción para esta búsqueda.</p>}</div></section>

      <form className="panel pos-cart" onSubmit={submit}><div className="pos-cart-title"><div><span>Venta actual</span><h2>{cartItems.length} producto(s)</h2></div><strong>{money(totalCents)}</strong></div><div className="pos-cart-lines">{cartItems.map(({ product, quantity }) => <div key={product.id}><div><b>{product.name}</b><small>{money(product.sale_price_cents)} c/u</small></div><div className="quantity-control"><button type="button" onClick={() => changeQuantity(product, quantity - 1)}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product, quantity + 1)}>＋</button></div><strong>{money(quantity * product.sale_price_cents)}</strong></div>)}{!cartItems.length && <p className="pos-empty">Agrega productos para iniciar la venta.</p>}</div>
        <div className="pos-target-tabs"><button type="button" className={saleType === "HUESPED" ? "active" : ""} onClick={() => setSaleType("HUESPED")}>Cargo a huésped</button><button type="button" className={saleType === "DIRECTA" ? "active" : ""} onClick={() => { setSaleType("DIRECTA"); if (paymentMethod === "PENDIENTE") setPaymentMethod("EFECTIVO"); }}>Venta directa</button></div>
        {saleType === "HUESPED" ? <div className="pos-fields"><label>Estadía activa<select required value={stayId} onChange={(event) => { setStayId(event.target.value); setConsumerGuestId(""); }}><option value="">Seleccionar…</option>{data.activeStays.map((stay) => <option value={stay.id} key={stay.id}>Hab. {stay.room_number} · {stay.primary_guest_name}</option>)}</select></label><label>Consumidor dentro de la estadía<select value={consumerGuestId} onChange={(event) => setConsumerGuestId(event.target.value)}><option value="">Titular responsable</option>{stayOccupants.map((occupant) => <option value={occupant.id} key={occupant.id}>{occupant.full_name}{occupant.is_primary ? " · Titular" : ""}</option>)}</select></label>{selectedStay && <p className="pos-stay-note"><b>Responsable:</b> {selectedStay.primary_guest_name} · Habitación {selectedStay.room_number}<br /><b>Pendiente actual:</b> {money(currentPending)}</p>}</div> : <div className="pos-fields"><label>Nombre del cliente (opcional)<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Consumidor final" /></label></div>}
        <div className="pos-fields"><label>Forma de pago<select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setPendingOverride(false); }}><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="QR">QR</option>{saleType === "HUESPED" && <option value="PENDIENTE">Cargo pendiente</option>}{isAdmin && <option value="CORTESIA">Cortesía autorizada</option>}<option value="OTRO">Otro</option></select></label><label>Observaciones<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Referencia o detalle opcional…" /></label></div>
        {paymentMethod === "PENDIENTE" && <div className={exceedsPendingLimit ? "pos-pending warning" : "pos-pending"}><span>Saldo resultante</span><b>{money(currentPending + totalCents)} / {money(data.pendingLimitCents)}</b>{exceedsPendingLimit && (isAdmin ? <label><input type="checkbox" checked={pendingOverride} onChange={(event) => setPendingOverride(event.target.checked)} /> Autorizar excepción administrativa</label> : <small>Solicita autorización administrativa para superar el límite.</small>)}</div>}
        <button className="primary pos-confirm" disabled={busy || !cartItems.length || (saleType === "HUESPED" && !stayId) || (exceedsPendingLimit && !pendingOverride)}>{busy ? "Registrando…" : `Confirmar venta · ${money(totalCents)}`}</button>
      </form>
    </div>

    <section className="panel pos-history"><div className="panel-head"><div><h2>Ventas recientes</h2><p>Comprobantes, cargos pendientes y anulaciones visibles.</p></div><span>{data.recentSales.length} registros</span></div><div className="pos-sales-table"><table><thead><tr><th>Número</th><th>Destino</th><th>Pago</th><th>Estado</th><th>Total</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{data.recentSales.map((sale) => <tr key={sale.id} className={sale.status === "ANULADA" ? "cancelled" : ""}><td><b>{sale.sale_number}</b><small>{new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" }).format(new Date(sale.created_at))}</small></td><td>{sale.sale_type === "HUESPED" ? `Hab. ${sale.room_number}` : sale.customer_name || "Venta directa"}</td><td>{paymentLabels[sale.payment_method] || sale.payment_method}</td><td><span className={`sale-status ${sale.status.toLowerCase()}`}>{saleStatusLabels[sale.status] || sale.status}</span>{sale.cancellation_reason && <small>{sale.cancellation_reason}</small>}</td><td><b>{money(sale.total_cents)}</b></td><td>{sale.created_by_name}</td><td><div className="sale-actions"><a href={`/api/store?receipt=${encodeURIComponent(sale.sale_number)}`} target="_blank" rel="noreferrer">{sale.print_count ? "Reimprimir" : "Imprimir"}</a>{sale.status !== "ANULADA" && <button disabled={busy} onClick={() => cancelSale(sale)}>Anular</button>}</div></td></tr>)}</tbody></table></div></section>
  </section>;
}
