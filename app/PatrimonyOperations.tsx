"use client";

import { FormEvent } from "react";
import type { PatrimonyData, PatrimonySection } from "./PatrimonyView";

type Props = {
  section: PatrimonySection;
  data: PatrimonyData;
  metrics: { potential: number; income: number; expenses: number; net: number };
  busy: boolean;
  submit: (payload: Record<string, unknown>) => Promise<boolean>;
};

const money = (cents: number) => new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format((Number(cents) || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
const statusLabels: Record<string, string> = { ACTIVO: "Activo", PENDIENTE: "Pendiente", VENCIDO: "Vencido", FINALIZADO: "Finalizado", CONCILIADO: "Conciliado", VERIFICADO: "Verificado", APROBADO: "Aprobado", RECHAZADO: "Rechazado" };

export default function PatrimonyOperations(props: Props) {
  if (props.section === "inquilinos") return <Tenants {...props} />;
  if (props.section === "movimientos") return <Movements {...props} />;
  if (props.section === "reporte") return <FamilyReport {...props} />;
  return null;
}

function Tenants({ data, busy, submit }: Props) {
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const ok = await submit({
      action: "tenant_save",
      propertyId: Number(form.get("propertyId")),
      fullName: form.get("fullName"),
      unitName: form.get("unitName"),
      ci: form.get("ci"),
      phone: form.get("phone"),
      monthlyRentCents: Math.round(Number(form.get("monthlyRent")) * 100),
      paymentDay: Number(form.get("paymentDay")),
      contractStart: form.get("contractStart"),
      contractEnd: form.get("contractEnd"),
      status: form.get("status"),
      notes: form.get("notes"),
    });
    if (ok) element.reset();
  };

  return <div className="patrimony-workspace">
    <form className="panel patrimony-form" onSubmit={save}>
      <div className="section-heading"><div><span>Contrato patrimonial</span><h2>Registrar inquilino</h2></div></div>
      <label>Propiedad<select name="propertyId" required defaultValue=""><option value="" disabled>Selecciona una propiedad</option>{data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      <div className="form-two"><label>Nombre o razón social<input name="fullName" required /></label><label>Unidad<input name="unitName" required placeholder="Tienda 01, Galpón…" /></label></div>
      <div className="form-two"><label>CI / NIT<input name="ci" /></label><label>Celular / WhatsApp<input name="phone" /></label></div>
      <div className="form-two"><label>Canon mensual (Bs)<input name="monthlyRent" type="number" min="0" step="0.01" required /></label><label>Día de pago<input name="paymentDay" type="number" min="1" max="31" required /></label></div>
      <div className="form-two"><label>Inicio de contrato<input name="contractStart" type="date" /></label><label>Fin de contrato<input name="contractEnd" type="date" /></label></div>
      <label>Estado<select name="status" defaultValue="ACTIVO"><option value="ACTIVO">Activo</option><option value="PENDIENTE">Pendiente</option><option value="VENCIDO">Vencido</option><option value="FINALIZADO">Finalizado</option></select></label>
      <label>Observaciones<textarea name="notes" /></label>
      <button className="primary" disabled={busy || !data.properties.length}>{busy ? "Guardando…" : "Registrar inquilino"}</button>
    </form>
    <section className="panel patrimony-list"><div className="section-heading"><div><span>Cartera vigente</span><h2>{data.tenants.length} inquilinos</h2></div></div><div className="patrimony-table-wrap"><table className="patrimony-table"><thead><tr><th>Inquilino</th><th>Propiedad / unidad</th><th>Canon</th><th>Vence</th><th>Contacto</th><th>Estado</th></tr></thead><tbody>{data.tenants.length ? data.tenants.map((tenant) => <tr key={tenant.id}><td><b>{tenant.full_name}</b><small>{tenant.ci || "Identificación no registrada"}</small></td><td>{tenant.property_name}<small>{tenant.unit_name}</small></td><td>{money(tenant.monthly_rent_cents)}</td><td>Día {tenant.payment_day}<small>{tenant.contract_end ? `Contrato hasta ${tenant.contract_end}` : "Sin fecha final"}</small></td><td>{tenant.phone || "—"}</td><td><span className={`patrimony-status ${tenant.status.toLowerCase()}`}>{statusLabels[tenant.status] || tenant.status}</span></td></tr>) : <tr><td colSpan={6} className="patrimony-empty">Aún no existen inquilinos patrimoniales.</td></tr>}</tbody></table></div></section>
  </div>;
}

function Movements({ data, busy, submit }: Props) {
  const savePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
    const ok = await submit({ action: "payment_create", propertyId: Number(form.get("propertyId")), tenantId: Number(form.get("tenantId")), paidOn: form.get("paidOn"), concept: form.get("concept"), amountCents: Math.round(Number(form.get("amount")) * 100), paymentMethod: form.get("paymentMethod"), status: form.get("status"), reference: form.get("reference"), notes: form.get("notes") });
    if (ok) element.reset();
  };
  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
    const ok = await submit({ action: "expense_create", propertyId: Number(form.get("propertyId")), incurredOn: form.get("incurredOn"), category: form.get("category"), description: form.get("description"), amountCents: Math.round(Number(form.get("amount")) * 100), evidenceNote: form.get("evidenceNote") });
    if (ok) element.reset();
  };
  const ledger = [
    ...data.payments.map((row) => ({ id: `p-${row.id}`, date: row.paid_on, kind: "income", title: row.concept, property: row.property_name, detail: `${row.tenant_name || "Cobro general"} · ${row.payment_method}`, amount: row.amount_cents, status: row.status })),
    ...data.expenses.map((row) => ({ id: `e-${row.id}`, date: row.incurred_on, kind: "expense", title: row.description, property: row.property_name, detail: `${row.category} · ${row.evidence_note}`, amount: -row.amount_cents, status: row.status })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  return <div className="patrimony-movements">
    <div className="patrimony-form-pair">
      <form className="panel patrimony-form" onSubmit={savePayment}><div className="section-heading"><div><span>Ingreso</span><h2>Registrar cobro</h2></div></div><label>Propiedad<select name="propertyId" required defaultValue=""><option value="" disabled>Selecciona una propiedad</option>{data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label>Inquilino relacionado<select name="tenantId" defaultValue=""><option value="">Cobro general</option>{data.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name} · {tenant.unit_name}</option>)}</select><small>Si eliges un inquilino, selecciona también su misma propiedad.</small></label><div className="form-two"><label>Fecha<input name="paidOn" type="date" defaultValue={today()} required /></label><label>Monto (Bs)<input name="amount" type="number" min="0.01" step="0.01" required /></label></div><label>Concepto<input name="concept" defaultValue="Alquiler" required /></label><div className="form-two"><label>Método<select name="paymentMethod" defaultValue="EFECTIVO"><option>EFECTIVO</option><option>TRANSFERENCIA</option><option>QR</option><option>OTRO</option></select></label><label>Estado<select name="status" defaultValue="CONCILIADO"><option>CONCILIADO</option><option>VERIFICADO</option><option>PENDIENTE</option></select></label></div><label>Referencia<input name="reference" placeholder="N.º de operación o recibo" /></label><label>Observación<textarea name="notes" /></label><button className="primary" disabled={busy || !data.properties.length}>Registrar cobro</button></form>
      <form className="panel patrimony-form expense" onSubmit={saveExpense}><div className="section-heading"><div><span>Egreso</span><h2>Registrar gasto</h2></div></div><label>Propiedad<select name="propertyId" required defaultValue=""><option value="" disabled>Selecciona una propiedad</option>{data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><div className="form-two"><label>Fecha<input name="incurredOn" type="date" defaultValue={today()} required /></label><label>Monto (Bs)<input name="amount" type="number" min="0.01" step="0.01" required /></label></div><label>Categoría<select name="category"><option>Mantenimiento</option><option>Legal</option><option>Limpieza</option><option>Construcción</option><option>Servicios</option><option>Impuestos</option><option>Otro</option></select></label><label>Descripción<textarea name="description" required /></label><label>Evidencia o comprobante<textarea name="evidenceNote" required placeholder="Ej. Factura N.º 123 y fotografías del trabajo" /></label><p className="patrimony-rule">Todo gasto entra pendiente y requiere revisión administrativa.</p><button className="primary" disabled={busy || !data.properties.length}>Registrar gasto</button></form>
    </div>
    <PendingExpenses {...{ data, busy, submit }} />
    <section className="panel patrimony-ledger"><div className="section-heading"><div><span>Libro patrimonial</span><h2>Movimientos recientes</h2></div></div><div className="patrimony-ledger-list">{ledger.length ? ledger.slice(0, 100).map((row) => <article key={row.id} className={row.kind}><span>{row.amount < 0 ? "−" : "+"}</span><div><b>{row.title}</b><small>{row.property} · {row.detail}</small></div><div><strong>{money(row.amount)}</strong><em className={`patrimony-status ${row.status.toLowerCase()}`}>{statusLabels[row.status] || row.status}</em><time>{row.date}</time></div></article>) : <p className="patrimony-empty">Aún no existen ingresos ni gastos registrados.</p>}</div></section>
  </div>;
}

function PendingExpenses({ data, busy, submit }: Props) {
  const pending = data.expenses.filter((expense) => expense.status === "PENDIENTE");
  if (!pending.length) return null;
  return <section className="panel patrimony-pending"><div className="section-heading"><div><span>Aprobaciones</span><h2>Gastos pendientes</h2></div><em>{pending.length}</em></div>{pending.map((expense) => <form key={expense.id} onSubmit={async (event) => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; await submit({ action: "expense_review", expenseId: expense.id, decision: submitter?.value, reviewNote: form.get("reviewNote") }); }}><div><b>{expense.description}</b><small>{expense.property_name} · {expense.category} · Evidencia: {expense.evidence_note}</small></div><strong>{money(expense.amount_cents)}</strong><input name="reviewNote" required placeholder="Nota administrativa" /><button type="submit" value="APROBADO" className="primary" disabled={busy}>Aprobar</button><button type="submit" value="RECHAZADO" className="danger-light" disabled={busy}>Rechazar</button></form>)}</section>;
}

function FamilyReport({ data, metrics, busy, submit }: Props) {
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await submit({ action: "distribution_save", rows: data.distribution.map((row) => ({ code: row.code, percentage: Number(form.get(row.code)) })) });
  };
  return <div className="patrimony-report"><section className="panel patrimony-report-main"><div className="section-heading"><div><span>Resumen mensual</span><h2>Distribución familiar</h2></div><em>{new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric" }).format(new Date())}</em></div><div className="report-balance"><div><span>Cobrado</span><strong>{money(metrics.income)}</strong></div><div><span>Gastos aprobados</span><strong>{money(metrics.expenses)}</strong></div><div><span>Neto operativo</span><strong>{money(metrics.net)}</strong></div></div><div className="distribution-bars">{data.distribution.map((row) => <article key={row.code}><header><b>{row.label}</b><span>{row.percentage}% · {money(metrics.income * row.percentage / 100)}</span></header><i><em style={{ width: `${row.percentage}%` }} /></i></article>)}</div><p className="patrimony-rule">La distribución se calcula sobre lo efectivamente cobrado. Los gastos reales se presentan por separado para mantener visible el resultado operativo.</p></section><form className="panel patrimony-form distribution-form" onSubmit={save}><div className="section-heading"><div><span>Configuración</span><h2>Porcentajes acordados</h2></div></div>{data.distribution.map((row) => <label key={row.code}>{row.label}<span><input name={row.code} type="number" min="0" max="100" defaultValue={row.percentage} required />%</span></label>)}<p>La suma debe ser exactamente 100%.</p><button className="primary" disabled={busy}>Guardar distribución</button></form></div>;
}
