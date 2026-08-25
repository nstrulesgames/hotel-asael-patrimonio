"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import PatrimonyOperations from "./PatrimonyOperations";

export type Property = { id: number; name: string; property_type: string; address: string; unit_count: number; monthly_potential_cents: number; status: string; notes: string; tenant_count: number; collected_cents: number; approved_expense_cents: number };
export type Tenant = { id: number; property_id: number; property_name: string; unit_name: string; full_name: string; ci?: string; phone?: string; monthly_rent_cents: number; payment_day: number; contract_start?: string; contract_end?: string; status: string; notes: string };
export type Payment = { id: number; property_id: number; property_name: string; tenant_id?: number; tenant_name?: string; unit_name?: string; paid_on: string; concept: string; amount_cents: number; payment_method: string; status: string; reference: string; notes: string; created_by_name: string };
export type Expense = { id: number; property_id: number; property_name: string; incurred_on: string; category: string; description: string; amount_cents: number; status: string; evidence_note: string; created_by_name: string; reviewed_by_name?: string; review_note?: string };
export type Distribution = { code: string; label: string; percentage: number; position: number };
export type PatrimonyData = { user: { id: number; name: string; role: string }; properties: Property[]; tenants: Tenant[]; payments: Payment[]; expenses: Expense[]; distribution: Distribution[] };
export type PatrimonySection = "resumen" | "propiedades" | "inquilinos" | "movimientos" | "reporte";

const money = (cents: number) => new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format((Number(cents) || 0) / 100);
const monthKey = () => new Date().toISOString().slice(0, 7);
const labels: Record<string, string> = { PRODUCTIVA: "Productiva", VACANTE: "Vacante", LITIGIO: "En litigio", DISPUTA: "En disputa", OPORTUNIDAD: "Oportunidad", INACTIVA: "Inactiva", PROPIETARIO: "Propietario", ADMINISTRADOR: "Administrador" };

async function readResponse(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error("El servidor no devolvió una respuesta válida."); }
}

export default function PatrimonyView() {
  const [data, setData] = useState<PatrimonyData | null>(null);
  const [section, setSection] = useState<PatrimonySection>("resumen");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/patrimony", { cache: "no-store" });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(result.error || "No se pudo cargar Patrimonio Base.");
    setData(result);
  }, []);

  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const metrics = useMemo(() => {
    if (!data) return { potential: 0, income: 0, expenses: 0, net: 0 };
    const income = data.payments.filter((payment) => payment.paid_on.startsWith(monthKey()) && payment.status !== "ANULADO").reduce((sum, payment) => sum + payment.amount_cents, 0);
    const expenses = data.expenses.filter((expense) => expense.incurred_on.startsWith(monthKey()) && expense.status === "APROBADO").reduce((sum, expense) => sum + expense.amount_cents, 0);
    return { potential: data.properties.reduce((sum, property) => sum + property.monthly_potential_cents, 0), income, expenses, net: income - expenses };
  }, [data]);

  const saveProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/patrimony", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "property_save", name: form.get("name"), propertyType: form.get("propertyType"), address: form.get("address"), unitCount: Number(form.get("unitCount")), monthlyPotentialCents: Math.round(Number(form.get("monthlyPotential")) * 100), status: form.get("status"), notes: form.get("notes") }) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la propiedad.");
      formElement.reset(); await load(); setNotice("Propiedad registrada correctamente.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo guardar la propiedad."); }
    finally { setBusy(false); }
  };

  const submit = async (payload: Record<string, unknown>) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/patrimony", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la información.");
      await load(); setNotice("Información patrimonial guardada correctamente.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar la información.");
      return false;
    } finally { setBusy(false); }
  };

  if (!data) return <section className="patrimony-loading panel"><span className="brand-mark">P</span><h2>Preparando Patrimonio Base…</h2>{notice && <p>{notice}</p>}</section>;

  const risks = data.properties.filter((property) => property.status === "LITIGIO" || property.status === "DISPUTA");
  return <div className="patrimony-page" data-section={section}>
    <section className="patrimony-hero"><div><span className="eyebrow">Acceso administrativo restringido</span><h2>Patrimonio Base</h2><p>Propiedades, alquileres, gastos y distribución familiar en un solo control.</p></div><div className="patrimony-lock"><span>Visibilidad</span><b>Solo Administración</b><small>{data.user.name} · {labels[data.user.role] || data.user.role}</small></div></section>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <nav className="patrimony-tabs" aria-label="Secciones patrimoniales">{(["resumen", "propiedades", "inquilinos", "movimientos", "reporte"] as PatrimonySection[]).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item === "resumen" ? "Resumen" : item === "propiedades" ? "Propiedades" : item === "inquilinos" ? "Inquilinos" : item === "movimientos" ? "Ingresos y gastos" : "Reporte familiar"}</button>)}</nav>
    <section className="patrimony-metrics"><article><span>Ingreso potencial mensual</span><strong>{money(metrics.potential)}</strong><small>{data.properties.length} propiedades registradas</small></article><article><span>Cobrado este mes</span><strong>{money(metrics.income)}</strong><small>{data.payments.length} movimientos</small></article><article><span>Gastos aprobados</span><strong>{money(metrics.expenses)}</strong><small>{data.expenses.filter((row) => row.status === "PENDIENTE").length} pendientes</small></article><article className={metrics.net < 0 ? "warning" : "positive"}><span>Neto del mes</span><strong>{money(metrics.net)}</strong><small>Ingresos menos gastos aprobados</small></article></section>
    <div className={"patrimony-workspace " + (section === "resumen" || section === "propiedades" ? "" : "patrimony-hidden")}>
      <form className="panel patrimony-form" onSubmit={saveProperty}><div className="section-heading"><div><span>Nuevo activo</span><h2>Registrar propiedad</h2></div></div><label>Nombre<input name="name" required placeholder="Ej. Hotel ASAEL" /></label><div className="form-two"><label>Tipo<input name="propertyType" required placeholder="Hotel, casa, mercado…" /></label><label>Estado<select name="status" defaultValue="PRODUCTIVA"><option value="PRODUCTIVA">Productiva</option><option value="VACANTE">Vacante</option><option value="LITIGIO">En litigio</option><option value="DISPUTA">En disputa</option><option value="OPORTUNIDAD">Oportunidad</option><option value="INACTIVA">Inactiva</option></select></label></div><label>Dirección<input name="address" placeholder="Ubicación o referencia" /></label><div className="form-two"><label>Unidades<input name="unitCount" type="number" min="0" defaultValue="0" required /></label><label>Potencial mensual (Bs)<input name="monthlyPotential" type="number" min="0" step="0.01" defaultValue="0" required /></label></div><label>Observaciones<textarea name="notes" placeholder="Estado, oportunidades o riesgos" /></label><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Registrar propiedad"}</button></form>
      <section className="panel patrimony-list"><div className="section-heading"><div><span>Portafolio vigente</span><h2>Resumen de propiedades</h2></div><em>{data.properties.filter((property) => property.status === "PRODUCTIVA").length} productivas</em></div><div className="patrimony-table-wrap"><table className="patrimony-table"><thead><tr><th>Propiedad</th><th>Unidades</th><th>Potencial</th><th>Cobrado</th><th>Gastos</th><th>Estado</th></tr></thead><tbody>{data.properties.length ? data.properties.map((property) => <tr key={property.id}><td><b>{property.name}</b><small>{property.property_type}{property.address ? ` · ${property.address}` : ""}</small></td><td>{property.unit_count}<small>{property.tenant_count} inquilinos</small></td><td>{money(property.monthly_potential_cents)}</td><td>{money(property.collected_cents)}</td><td>{money(property.approved_expense_cents)}</td><td><span className={`patrimony-status ${property.status.toLowerCase()}`}>{labels[property.status] || property.status}</span></td></tr>) : <tr><td colSpan={6} className="patrimony-empty">Registra la primera propiedad para iniciar el control patrimonial.</td></tr>}</tbody></table></div>{risks.length > 0 && <div className="patrimony-risk"><b>{risks.length} activo(s) requieren seguimiento</b><span>{risks.map((property) => property.name).join(", ")}</span></div>}</section>
    </div>
    <section className="panel patrimony-distribution"><div className="section-heading"><div><span>Distribución familiar</span><h2>Proyección sobre lo cobrado</h2></div></div><div>{data.distribution.map((row) => <article key={row.code}><span>{row.label}</span><b>{row.percentage}%</b><strong>{money(metrics.income * row.percentage / 100)}</strong><i><em style={{ width: `${row.percentage}%` }} /></i></article>)}</div><p>La configuración completa de inquilinos, cobros, gastos y reportes continúa en el siguiente bloque.</p></section>
    {section !== "resumen" && section !== "propiedades" && <PatrimonyOperations section={section} data={data} metrics={metrics} busy={busy} submit={submit} />}
  </div>;
}
