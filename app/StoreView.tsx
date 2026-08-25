"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type StoreProduct = {
  id: number; sku: string; name: string; category: string; purchase_unit: string; sale_unit: string;
  units_per_purchase: number; sale_price_cents: number; average_cost_cents: number | null; minimum_stock: number;
  tracks_expiry: number; active: number; main_stock: number | null; reception_stock: number; total_stock: number; next_expiry?: string;
};
type StoreMovement = { id: number; product_name: string; sale_unit: string; movement_type: string; quantity: number; total_cost_cents: number | null; from_location_name?: string; to_location_name?: string; reason: string; responsible: string; created_by: string; created_at: string };
type ExpiringBatch = { id: number; product_name: string; location_name: string; quantity: number; expires_on: string };
type Replenishment = { id: number; product_id: number; product_name: string; sku: string; sale_unit: string; requested_quantity: number; notes: string; status: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "CANCELADA"; requested_by_user_id: number; requested_by_name: string; requested_at: string; reviewed_by_name?: string; reviewed_at?: string; review_note?: string; main_stock: number; reception_stock: number };
type StoreData = { user: { id: number; name: string; role: string }; products: StoreProduct[]; movements: StoreMovement[]; expiring: ExpiringBatch[]; replenishments: Replenishment[]; pendingLimitCents: number };

const money = (cents: number | null | undefined) => cents === null || cents === undefined ? "—" : new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(cents / 100);
const date = (value?: string) => value ? new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(value.includes("T") ? value : `${value}T12:00:00`)) : "—";
const movementLabels: Record<string, string> = { ENTRADA: "Ingreso", TRANSFERENCIA: "Transferencia", AJUSTE_POSITIVO: "Ajuste positivo", AJUSTE_NEGATIVO: "Ajuste negativo", VENCIMIENTO: "Vencimiento", DEVOLUCION: "Devolución" };

async function jsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) throw new Error("El servidor no respondió. Intenta nuevamente.");
  try { return JSON.parse(text); } catch { throw new Error("El servidor devolvió una respuesta inválida."); }
}

export default function StoreView() {
  const [data, setData] = useState<StoreData | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StoreProduct | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/store", { cache: "no-store" });
    const result = await jsonResponse(response);
    if (!response.ok) throw new Error(result.error || "No se pudo cargar el almacén.");
    setData(result);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API persistente
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await jsonResponse(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el movimiento.");
      await load();
      setNotice("Operación de almacén registrada correctamente.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ocurrió un error.");
      return false;
    } finally { setBusy(false); }
  };

  const admin = data?.user.role === "PROPIETARIO" || data?.user.role === "ADMINISTRADOR";
  const activeProducts = useMemo(() => data?.products.filter((product) => product.active) || [], [data]);
  const lowStock = useMemo(() => activeProducts.filter((product) => product.reception_stock <= product.minimum_stock), [activeProducts]);
  const receptionUnits = activeProducts.reduce((sum, product) => sum + product.reception_stock, 0);

  if (!data) return <section className="store-loading"><div className="panel"><h2>Almacén comercial</h2><p>{notice || "Preparando catálogo y existencias…"}</p>{notice && <button className="primary" onClick={() => { setNotice(""); load().catch((error) => setNotice(error.message)); }}>Intentar nuevamente</button>}</div></section>;

  return <section className="store-page">
    <div className="store-hero">
      <div><p className="eyebrow">Mini POS · Base comercial</p><h2>Catálogo y almacén</h2><p>Controla qué se vende, cuánto cuesta y qué existencias están disponibles en recepción.</p></div>
      <div className="store-location-pill"><span>Ubicaciones activas</span><b>Almacén principal + Recepción</b></div>
    </div>

    {notice && <div className="notice store-notice">{notice}</div>}

    <div className="store-metrics">
      <article><span>Productos activos</span><strong>{activeProducts.length}</strong><small>Catálogo disponible</small></article>
      <article><span>Unidades en recepción</span><strong>{receptionUnits}</strong><small>Disponibles para ventas</small></article>
      <article className={lowStock.length ? "warning" : ""}><span>Stock mínimo</span><strong>{lowStock.length}</strong><small>{lowStock.length ? "Requieren reposición" : "Sin alertas"}</small></article>
      <article className={data.expiring.length ? "warning" : ""}><span>Vencimientos ≤ 30 días</span><strong>{data.expiring.length}</strong><small>Lotes por revisar</small></article>
    </div>

    {admin && <div className="store-forms-grid">
      <ProductForm editing={editing} busy={busy} onCancel={() => setEditing(null)} onSave={async (payload) => { const ok = await action(payload); if (ok) setEditing(null); return ok; }} />
      <StockEntryForm products={activeProducts} busy={busy} onSave={action} />
      <TransferForm products={activeProducts} busy={busy} onSave={action} />
      <StockAdjustmentForm products={activeProducts} busy={busy} onSave={action} />
    </div>}

    <div className="store-request-grid"><ReplenishmentForm products={activeProducts} busy={busy} onSave={action} />{admin && <CommercialSettingsForm pendingLimitCents={data.pendingLimitCents} busy={busy} onSave={action} />}</div>

    <section className="panel replenishment-panel"><div className="section-heading"><div><p className="eyebrow">Flujo de reposición</p><h2>Solicitudes de recepción</h2></div><span>{data.replenishments.filter((request) => request.status === "PENDIENTE").length} pendientes</span></div><div className="replenishment-list">{data.replenishments.length === 0 ? <p className="empty-copy">No existen solicitudes de reposición.</p> : data.replenishments.map((request) => <article key={request.id} className={`request-${request.status.toLowerCase()}`}><header><div><b>#{request.id} · {request.product_name}</b><small>{request.requested_quantity} {request.sale_unit} solicitadas · Principal {request.main_stock} · Recepción {request.reception_stock}</small></div><em>{request.status}</em></header><p>{request.notes || "Sin observaciones"}</p><footer><span>Solicitado por {request.requested_by_name} · {date(request.requested_at)}</span>{request.reviewed_by_name && <small>Resuelto por {request.reviewed_by_name}: {request.review_note}</small>}{request.status === "PENDIENTE" && <div>{admin ? <><button className="danger-light" disabled={busy} onClick={async () => { const reviewNote = window.prompt("Motivo obligatorio del rechazo:"); if (reviewNote?.trim()) await action({ action: "replenishment_review", requestId: request.id, decision: "RECHAZADA", reviewNote }); }}>Rechazar</button><button className="primary" disabled={busy || request.main_stock < request.requested_quantity} onClick={async () => { const reviewNote = window.prompt("Nota de aprobación:", "Reposición autorizada"); if (!reviewNote?.trim()) return; const responsible = window.prompt("¿Quién entrega y quién recibe?"); if (responsible?.trim()) await action({ action: "replenishment_review", requestId: request.id, decision: "APROBADA", reviewNote, responsible }); }}>Aprobar y transferir</button></> : request.requested_by_user_id === data.user.id && <button className="danger-light" disabled={busy} onClick={async () => { const reason = window.prompt("Motivo para cancelar la solicitud:"); if (reason?.trim()) await action({ action: "replenishment_cancel", requestId: request.id, reason }); }}>Cancelar solicitud</button>}</div>}</footer></article>)}</div></section>

    {lowStock.length > 0 && <div className="store-alert panel"><div><span className="store-alert-icon">!</span><div><h3>Reposición necesaria</h3><p>{lowStock.map((product) => `${product.name}: ${product.reception_stock} ${product.sale_unit}`).join(" · ")}</p></div></div></div>}

    <div className="store-content-grid">
      <div className="panel store-catalog">
        <div className="section-heading"><div><p className="eyebrow">Existencias</p><h2>Catálogo comercial</h2></div><span>{data.products.length} registrados</span></div>
        <div className="store-table-wrap"><table className="store-table"><thead><tr><th>Producto</th><th>Precio</th>{admin && <th>Almacén</th>}<th>Recepción</th>{admin && <th>Costo prom.</th>}<th>Próximo venc.</th>{admin && <th></th>}</tr></thead><tbody>
          {data.products.length === 0 && <tr><td colSpan={admin ? 7 : 4} className="store-empty">Crea el primer producto para comenzar.</td></tr>}
          {data.products.map((product) => <tr key={product.id} className={!product.active ? "inactive" : product.reception_stock <= product.minimum_stock ? "low" : ""}>
            <td><div className="product-name"><b>{product.name}</b><small>{product.sku} · {product.category} · {product.units_per_purchase} {product.sale_unit} por {product.purchase_unit}</small>{!product.active && <em>Inactivo</em>}</div></td>
            <td>{money(product.sale_price_cents)}</td>
            {admin && <td><strong>{product.main_stock}</strong> <small>{product.sale_unit}</small></td>}
            <td><strong>{product.reception_stock}</strong> <small>{product.sale_unit}</small>{product.reception_stock <= product.minimum_stock && <span className="stock-low-label">Mín. {product.minimum_stock}</span>}</td>
            {admin && <td>{money(product.average_cost_cents)}</td>}
            <td>{date(product.next_expiry)}</td>
            {admin && <td><div className="store-row-actions"><button className="text-button" onClick={() => setEditing(product)}>Editar</button><button className="text-button muted" onClick={async () => { const reason = window.prompt(`Motivo para ${product.active ? "desactivar" : "reactivar"} ${product.name}:`); if (reason?.trim()) await action({ action: "product_toggle", productId: product.id, active: !product.active, reason }); }}>{product.active ? "Desactivar" : "Reactivar"}</button></div></td>}
          </tr>)}</tbody></table></div>
      </div>

      <div className="panel store-expiry">
        <div className="section-heading"><div><p className="eyebrow">Rotación FEFO</p><h2>Vencimientos</h2></div></div>
        {data.expiring.length === 0 ? <p className="empty-copy">No existen lotes próximos a vencer.</p> : <div className="expiry-list">{data.expiring.map((batch) => <article key={batch.id}><div><b>{batch.product_name}</b><small>{batch.location_name} · {batch.quantity} unidades</small></div><time>{date(batch.expires_on)}</time></article>)}</div>}
      </div>
    </div>

    <div className="panel store-movements">
      <div className="section-heading"><div><p className="eyebrow">Auditoría comercial</p><h2>Últimos movimientos</h2></div><span>{data.movements.length} visibles</span></div>
      <div className="movement-list">{data.movements.length === 0 ? <p className="empty-copy">Los ingresos y transferencias aparecerán aquí.</p> : data.movements.map((movement) => <article key={movement.id}>
        <span className={`movement-icon ${movement.movement_type.toLowerCase()}`}>{movement.movement_type === "ENTRADA" ? "+" : "→"}</span>
        <div><b>{movementLabels[movement.movement_type] || movement.movement_type} · {movement.product_name}</b><small>{movement.from_location_name ? `${movement.from_location_name} → ` : ""}{movement.to_location_name || "Sin destino"} · {movement.reason}</small><small>{movement.responsible} · registrado por {movement.created_by}</small></div>
        <div className="movement-amount"><strong>{movement.quantity} {movement.sale_unit}</strong>{admin && <small>{money(movement.total_cost_cents)}</small>}<time>{date(movement.created_at)}</time></div>
      </article>)}</div>
    </div>
  </section>;
}

function ProductForm({ editing, busy, onCancel, onSave }: { editing: StoreProduct | null; busy: boolean; onCancel: () => void; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const ok = await onSave({ action: "product_save", productId: editing?.id, sku: values.get("sku"), name: values.get("name"), category: values.get("category"), purchaseUnit: values.get("purchaseUnit"), saleUnit: values.get("saleUnit"), unitsPerPurchase: Number(values.get("unitsPerPurchase")), salePriceCents: Math.round(Number(values.get("salePrice")) * 100), minimumStock: Number(values.get("minimumStock")), tracksExpiry: values.get("tracksExpiry") === "on" });
    if (ok && !editing) form.reset();
  };
  return <form className="panel store-form" onSubmit={submit} key={editing?.id || "new"}><div className="store-form-title"><div><span>01</span><div><h3>{editing ? "Editar producto" : "Nuevo producto"}</h3><p>Define unidades, precio y alertas.</p></div></div>{editing && <button type="button" className="text-button" onClick={onCancel}>Cancelar</button>}</div>
    <div className="form-two"><label>Código / SKU<input name="sku" defaultValue={editing?.sku} placeholder="AGUA-600" required /></label><label>Producto<input name="name" defaultValue={editing?.name} placeholder="Agua 600 ml" required /></label></div>
    <label>Categoría<select name="category" defaultValue={editing?.category || "BEBIDAS"}><option>BEBIDAS</option><option>SNACKS</option><option>HIGIENE</option><option>OTROS</option></select></label>
    <div className="form-three"><label>Compra por<input name="purchaseUnit" defaultValue={editing?.purchase_unit || "caja"} required /></label><label>Venta por<input name="saleUnit" defaultValue={editing?.sale_unit || "unidad"} required /></label><label>Unid. por compra<input name="unitsPerPurchase" type="number" min="1" defaultValue={editing?.units_per_purchase || 1} required /></label></div>
    <div className="form-two"><label>Precio de venta (Bs)<input name="salePrice" type="number" min="0" step="0.01" defaultValue={editing ? editing.sale_price_cents / 100 : ""} required /></label><label>Stock mínimo<input name="minimumStock" type="number" min="0" defaultValue={editing?.minimum_stock || 0} required /></label></div>
    <label className="check-label"><input name="tracksExpiry" type="checkbox" defaultChecked={Boolean(editing?.tracks_expiry)} /> Controlar lotes y vencimiento</label>
    <button className="primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}</button>
  </form>;
}

function StockEntryForm({ products, busy, onSave }: { products: StoreProduct[]; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [productId, setProductId] = useState(""); const selected = products.find((product) => String(product.id) === productId);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const ok = await onSave({ action: "stock_entry", productId: Number(values.get("productId")), purchaseQuantity: Number(values.get("purchaseQuantity")), purchaseCostCents: Math.round(Number(values.get("purchaseCost")) * 100), expiresOn: values.get("expiresOn"), reason: values.get("reason"), responsible: values.get("responsible") }); if (ok) { form.reset(); setProductId(""); } };
  return <form className="panel store-form" onSubmit={submit}><div className="store-form-title"><div><span>02</span><div><h3>Ingreso al almacén</h3><p>Registra compras y su costo real.</p></div></div></div>
    <label>Producto<select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="">Seleccionar…</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
    <div className="form-two"><label>Cantidad de {selected?.purchase_unit || "compra"}<input name="purchaseQuantity" type="number" min="1" required /></label><label>Costo por {selected?.purchase_unit || "compra"} (Bs)<input name="purchaseCost" type="number" min="0" step="0.01" required /></label></div>
    {selected?.tracks_expiry ? <label>Fecha de vencimiento<input name="expiresOn" type="date" required /></label> : <input name="expiresOn" type="hidden" />}
    <label>Motivo<input name="reason" defaultValue="Compra de mercadería" required /></label><label>Responsable físico<input name="responsible" placeholder="Persona que recibió" required /></label>
    <button className="primary" disabled={busy || !products.length}>{busy ? "Registrando…" : "Registrar ingreso"}</button>
  </form>;
}

function TransferForm({ products, busy, onSave }: { products: StoreProduct[]; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const ok = await onSave({ action: "stock_transfer", productId: Number(values.get("productId")), quantity: Number(values.get("quantity")), reason: values.get("reason"), responsible: values.get("responsible") }); if (ok) form.reset(); };
  return <form className="panel store-form" onSubmit={submit}><div className="store-form-title"><div><span>03</span><div><h3>Reponer recepción</h3><p>Transfiere por vencimiento más próximo.</p></div></div></div>
    <label>Producto<select name="productId" required><option value="">Seleccionar…</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · almacén {product.main_stock ?? 0}</option>)}</select></label>
    <label>Cantidad en unidades de venta<input name="quantity" type="number" min="1" required /></label><label>Motivo<input name="reason" defaultValue="Reposición de Stock de recepción" required /></label><label>Entrega y recibe<input name="responsible" placeholder="Ej. Ana entrega / Luis recibe" required /></label>
    <button className="primary" disabled={busy || !products.length}>{busy ? "Transfiriendo…" : "Transferir a recepción"}</button>
  </form>;
}

function ReplenishmentForm({ products, busy, onSave }: { products: StoreProduct[]; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const ok = await onSave({ action: "replenishment_request", productId: Number(values.get("productId")), quantity: Number(values.get("quantity")), notes: values.get("notes") }); if (ok) form.reset(); };
  return <form className="panel store-form replenishment-form" onSubmit={submit}><div className="store-form-title"><div><span>R</span><div><h3>Solicitar reposición</h3><p>Recepción solicita; Administración entrega y confirma.</p></div></div></div><label>Producto<select name="productId" required><option value="">Seleccionar…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · recepción {product.reception_stock}</option>)}</select></label><label>Cantidad en unidades de venta<input name="quantity" type="number" min="1" required /></label><label>Necesidad u observación<input name="notes" placeholder="Stock bajo, demanda prevista…" /></label><button className="primary" disabled={busy || !products.length}>{busy ? "Enviando…" : "Enviar solicitud"}</button></form>;
}

function CommercialSettingsForm({ pendingLimitCents, busy, onSave }: { pendingLimitCents: number; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); await onSave({ action: "setting_save", pendingLimitCents: Math.round(Number(values.get("pendingLimit")) * 100) }); };
  return <form className="panel store-form commercial-settings-form" onSubmit={submit}><div className="store-form-title"><div><span>⚙</span><div><h3>Control de consumos</h3><p>Límite general antes de exigir autorización.</p></div></div></div><label>Límite pendiente por estadía (Bs)<input name="pendingLimit" type="number" min="0" max="10000" step="0.01" defaultValue={(pendingLimitCents / 100).toFixed(2)} required /></label><small>Valor vigente: {money(pendingLimitCents)}. Los saldos ya existentes no se modifican.</small><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Actualizar límite"}</button></form>;
}

function StockAdjustmentForm({ products, busy, onSave }: { products: StoreProduct[]; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [direction, setDirection] = useState("NEGATIVO");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const ok = await onSave({ action: "stock_adjust", productId: Number(values.get("productId")), locationCode: values.get("locationCode"), direction: values.get("direction"), category: values.get("category"), quantity: Number(values.get("quantity")), reason: values.get("reason"), responsible: values.get("responsible") }); if (ok) form.reset(); };
  return <form className="panel store-form adjustment-form" onSubmit={submit}><div className="store-form-title"><div><span>04</span><div><h3>Ajuste o pérdida</h3><p>Corrige conteos y retira daño o vencimiento.</p></div></div></div><label>Producto<select name="productId" required><option value="">Seleccionar…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="form-two"><label>Ubicación<select name="locationCode"><option value="MAIN">Almacén principal</option><option value="RECEPTION">Recepción</option></select></label><label>Dirección<select name="direction" value={direction} onChange={(event) => setDirection(event.target.value)}><option value="NEGATIVO">Retirar existencias</option><option value="POSITIVO">Agregar por corrección</option></select></label></div><div className="form-two"><label>Tipo<select name="category"><option value="CONTEO">Corrección de conteo</option>{direction === "NEGATIVO" && <><option value="PERDIDA">Pérdida</option><option value="DANO">Daño</option><option value="VENCIMIENTO">Vencimiento</option></>}<option value="OTRO">Otro</option></select></label><label>Cantidad<input name="quantity" type="number" min="1" required /></label></div><label>Motivo obligatorio<input name="reason" required placeholder="Describe el hallazgo y la corrección…" /></label><label>Responsable físico<input name="responsible" required placeholder="Persona que verificó o retiró" /></label><button className="primary" disabled={busy || !products.length}>{busy ? "Registrando…" : "Registrar ajuste"}</button></form>;
}
