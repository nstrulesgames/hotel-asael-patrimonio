import { env } from "@/lib/runtime-env";

type ReportUser = { id: number; role: string };

async function reportUser(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (["localhost", "127.0.0.1"].includes(url.hostname) ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  const user = await env.DB.prepare("SELECT id, role FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 LIMIT 1").bind(externalId, email).first<ReportUser>();
  return user && ["PROPIETARIO", "ADMINISTRADOR"].includes(user.role) ? user : null;
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export async function GET(request: Request) {
  const user = await reportUser(request);
  if (!user) return Response.json({ error: "Solo Administración puede exportar reportes comerciales." }, { status: 403 });
  const type = new URL(request.url).searchParams.get("type") || "sales";
  let filename = "ventas-comerciales.csv";
  let content = "";
  if (type === "sales") {
    const result = await env.DB.prepare(`SELECT sale.sale_number, sale.created_at, sale.sale_type, COALESCE(room.number, '') AS room_number,
      COALESCE(guest.full_name, sale.customer_name, 'Venta directa') AS consumer, sale.customer_ci, sale.customer_phone,
      sale.status, sale.payment_method, sale.total_cents, sale.created_by_name, sale.cancellation_reason, sale.courtesy_reviewed_by_name, sale.courtesy_review_note
      FROM sales sale LEFT JOIN rooms room ON room.id = sale.room_id LEFT JOIN guests guest ON guest.id = sale.consumer_guest_id ORDER BY sale.created_at DESC`).all<Record<string, unknown>>();
    content = csv(["Venta", "Fecha", "Tipo", "Habitación", "Consumidor", "CI", "Celular", "Estado", "Forma de pago", "Total Bs", "Trabajador", "Anulación", "Revisó cortesía", "Nota cortesía"], result.results.map((row) => [row.sale_number, row.created_at, row.sale_type, row.room_number, row.consumer, row.customer_ci, row.customer_phone, row.status, row.payment_method, (Number(row.total_cents) / 100).toFixed(2), row.created_by_name, row.cancellation_reason, row.courtesy_reviewed_by_name, row.courtesy_review_note]));
  } else if (type === "inventory") {
    filename = "existencias-y-movimientos.csv";
    const result = await env.DB.prepare(`SELECT movement.id, movement.created_at, product.sku, product.name, movement.movement_type, movement.quantity,
      movement.total_cost_cents, source.name AS origen, destination.name AS destino, movement.reason, movement.responsible, movement.supplier, movement.receipt_number, movement.created_by
      FROM stock_movements movement JOIN commercial_products product ON product.id = movement.product_id
      LEFT JOIN stock_locations source ON source.id = movement.from_location_id LEFT JOIN stock_locations destination ON destination.id = movement.to_location_id
      ORDER BY movement.created_at DESC`).all<Record<string, unknown>>();
    content = csv(["ID", "Fecha", "SKU", "Producto", "Movimiento", "Cantidad", "Costo total Bs", "Origen", "Destino", "Motivo", "Responsable", "Proveedor", "Comprobante", "Registrado por"], result.results.map((row) => [row.id, row.created_at, row.sku, row.name, row.movement_type, row.quantity, (Number(row.total_cost_cents) / 100).toFixed(2), row.origen, row.destino, row.reason, row.responsible, row.supplier, row.receipt_number, row.created_by]));
  } else {
    return Response.json({ error: "Tipo de reporte no reconocido." }, { status: 400 });
  }
  return new Response(content, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store" } });
}
