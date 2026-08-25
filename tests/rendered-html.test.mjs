import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL("../" + path, import.meta.url);

test("tolera el primer render mientras los datos del hotel todavía cargan", async () => {
  const dashboard = await readFile(projectFile("app/HotelDashboard.tsx"), "utf8");
  assert.match(dashboard, /const pendingApprovals = data\s*\?/);
  assert.match(dashboard, /if \(!data\) return <div className="loading"/);
  assert.doesNotMatch(dashboard, /const pendingApprovals = data\.changeRequests/);
});

test("incluye el tablero de tareas operativas en la interfaz", async () => {
  const dashboard = await readFile(projectFile("app/HotelDashboard.tsx"), "utf8");
  assert.match(dashboard, /Tareas operativas/);
  assert.match(dashboard, /function WorkOrdersView/);
  assert.match(dashboard, /function TaskEvidence/);
  assert.match(dashboard, /TRABAJO_ANTES/);
  assert.match(dashboard, /TRABAJO_DESPUES/);
});

test("protege el cierre de reparaciones y la disponibilidad de habitaciones", async () => {
  const route = await readFile(projectFile("app/api/hotel/route.ts"), "utf8");
  assert.match(route, /work_order_create/);
  assert.match(route, /work_order_update/);
  assert.match(route, /Para cerrar reparaciones, daños o mantenimiento/);
  assert.match(route, /blockingTask/);
  assert.match(route, /status IN \('PENDIENTE', 'EN_PROCESO'\)/);
});

test("persiste órdenes, historial y evidencias relacionadas", async () => {
  const [schema, migration, documents] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0008_thin_fat_cobra.sql"), "utf8"),
    readFile(projectFile("app/api/documents/route.ts"), "utf8"),
  ]);
  assert.match(schema, /workOrders/);
  assert.match(schema, /workOrderHistory/);
  assert.match(migration, /CREATE TABLE `work_orders`/);
  assert.match(migration, /CREATE TABLE `work_order_history`/);
  assert.match(documents, /work_order_id/);
});

test("aplica la ventana de corrección y conserva solicitudes pendientes", async () => {
  const [route, dashboard, migration] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0009_round_doctor_faustus.sql"), "utf8"),
  ]);
  assert.match(route, /30 \* 60 \* 1000/);
  assert.match(route, /correction_submit/);
  assert.match(route, /correction_review/);
  assert.match(route, /El dato original cambió después de la solicitud/);
  assert.match(dashboard, /function ApprovalsView/);
  assert.match(dashboard, /function CorrectionForm/);
  assert.match(migration, /change_requests/);
});

test("muestra vencimientos sin finalizar estadías automáticamente", async () => {
  const route = await readFile(projectFile("app/api/hotel/route.ts"), "utf8");
  assert.match(route, /ESTADIA_VENCIDA/);
  assert.match(route, /TAREA_VENCIDA/);
  assert.match(route, /TAREA_POR_VENCER/);
});

test("conserva el historial de acompañantes sin borrar permanencias", async () => {
  const [route, dashboard, migration] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0010_short_mister_sinister.sql"), "utf8"),
  ]);
  assert.match(route, /occupant_add/);
  assert.match(route, /occupant_remove/);
  assert.match(route, /left_at IS NULL/);
  assert.doesNotMatch(route, /DELETE FROM stay_guests/);
  assert.match(dashboard, /function OccupantsManager/);
  assert.match(route, /El titular no puede retirarse desde acompañantes/);
  assert.match(migration, /ALTER TABLE `stay_guests` ADD `joined_at`/);
  assert.match(migration, /ALTER TABLE `stay_guests` ADD `left_at`/);
});

test("unifica la auditoría y la limita a administración", async () => {
  const [route, dashboard, migration] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0010_short_mister_sinister.sql"), "utf8"),
  ]);
  assert.match(route, /auditFeed/);
  assert.match(route, /if \(role === "RECEPCION"\) return \{ results: \[\]/);
  assert.match(route, /room_events/);
  assert.match(route, /work_order_history/);
  assert.match(route, /user_access_events/);
  assert.match(route, /change_requests/);
  assert.match(dashboard, /function AuditView/);
  assert.match(dashboard, /data\.user\.role !== "RECEPCION"/);
  assert.match(migration, /CREATE TABLE `audit_logs`/);
});

test("construye un expediente integral por huésped", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  assert.match(route, /guestProfiles/);
  assert.match(route, /guestStayHistory/);
  assert.match(route, /COUNT\(DISTINCT sg\.stay_id\)/);
  assert.match(route, /document_count/);
  assert.match(dashboard, /function GuestsView/);
  assert.match(dashboard, /function GuestProfileCard/);
  assert.match(dashboard, /Historial de estadías/);
  assert.match(dashboard, /Documentos del expediente/);
});

test("traspasa titularidad con aprobación y conserva el historial", async () => {
  const [schema, route, dashboard, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0011_robust_madame_web.sql"), "utf8"),
  ]);
  assert.match(schema, /primaryGuestTransfers/);
  assert.match(migration, /CREATE TABLE `primary_guest_transfers`/);
  assert.match(route, /primary_transfer_submit/);
  assert.match(route, /primary_transfer_review/);
  assert.match(route, /El nuevo titular debe ser un acompañante activo/);
  assert.match(route, /UPDATE stays SET primary_guest_id/);
  assert.match(route, /UPDATE stay_guests SET is_primary = CASE/);
  assert.doesNotMatch(route, /DELETE FROM primary_guest_transfers/);
  assert.match(dashboard, /function PrimaryTransferForm/);
  assert.match(dashboard, /Aprobar traspaso/);
});

test("compara entrega y devolución sin penalizar observaciones preexistentes", async () => {
  const [schema, route, dashboard, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0012_glamorous_morlocks.sql"), "utf8"),
  ]);
  assert.match(schema, /exitAssessments/);
  assert.match(migration, /CREATE TABLE `exit_assessments`/);
  assert.match(route, /compareDeliveryAndReturn/);
  assert.match(route, /severity\[returnedCondition\].*>.*severity\[delivered\.condition\]/s);
  assert.match(route, /quantityMissing/);
  assert.match(dashboard, /function ExitAssessmentForm/);
  assert.match(dashboard, /Revisión comparativa de salida/);
});

test("bloquea la salida observada y crea una tarea hasta la resolución", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  assert.match(route, /exit_assessment_submit/);
  assert.match(route, /exit_assessment_review/);
  assert.match(route, /exit_assessment_resubmit/);
  assert.match(route, /Resolver observaciones de devolución/);
  assert.match(route, /blocks_room/);
  assert.match(route, /\["SIN_OBSERVACIONES", "APROBADA"\]\.includes\(exitAssessment\.status\)/);
  assert.match(route, /Primero completa la tarea bloqueante asociada/);
  assert.match(dashboard, /Autorizar salida/);
  assert.match(dashboard, /Completa primero la tarea bloqueante/);
});

test("guía evidencias según inventario e infraestructura y admite carga múltiple", async () => {
  const [dashboard, documents, route, migration] = await Promise.all([
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("app/api/documents/route.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("drizzle/0013_regular_tomas.sql"), "utf8"),
  ]);
  assert.match(dashboard, /Evidencias guiadas/);
  assert.match(dashboard, /infrastructure\.filter/);
  assert.match(dashboard, /multiple capture=/);
  assert.match(documents, /form\.getAll\("files"\)/);
  assert.match(documents, /Puedes cargar como máximo 10 archivos por vez/);
  assert.match(route, /room_infrastructure_items/);
  assert.match(migration, /CREATE TABLE `room_infrastructure_items`/);
});

test("registra movimientos de inventario sin alterar el inventario base", async () => {
  const [schema, route, dashboard, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0013_regular_tomas.sql"), "utf8"),
  ]);
  assert.match(schema, /inventoryMovements/);
  assert.match(route, /body\.action === "inventory_movement"/);
  assert.match(route, /MOVIMIENTO_INVENTARIO/);
  assert.doesNotMatch(route, /inventory_movement[\s\S]{0,1500}UPDATE inventory_items SET quantity/);
  assert.match(dashboard, /function InventoryMovementForm/);
  assert.match(dashboard, /Entregado durante la estadía/);
  assert.match(migration, /CREATE TABLE `inventory_movements`/);
});

test("controla la salida sin firma con evidencias y aprobación independiente", async () => {
  const [schema, route, dashboard, documents, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("app/api/documents/route.ts"), "utf8"),
    readFile(projectFile("drizzle/0014_complex_marvel_apes.sql"), "utf8"),
  ]);
  assert.match(schema, /exceptionalExitRequests/);
  assert.match(migration, /CREATE TABLE `exceptional_exit_requests`/);
  assert.match(route, /exceptional_exit_submit/);
  assert.match(route, /exceptional_exit_review/);
  assert.match(route, /requested_by_user_id === user\?\.id/);
  assert.match(route, /No puedes aprobar ni rechazar tu propia solicitud/);
  assert.match(route, /category = 'SALIDA_SIN_FIRMA'/);
  assert.match(documents, /SALIDA_SIN_FIRMA/);
  assert.match(dashboard, /function ExceptionalExitForm/);
  assert.match(dashboard, /existing && existing\.status !== "RECHAZADA"/);
});

test("reabre una estadía cerrada solamente antes de iniciar la limpieza", async () => {
  const route = await readFile(projectFile("app/api/hotel/route.ts"), "utf8");
  assert.match(route, /body\.action === "stay_reopen"/);
  assert.match(route, /room\.status !== "LIMPIEZA"/);
  assert.match(route, /turnover\.status !== "PENDIENTE"/);
  assert.match(route, /UPDATE stays SET status = 'ACTIVA', check_out = NULL/);
  assert.match(route, /INSERT INTO stay_room_segments/);
  assert.match(route, /REAPERTURA:/);
  assert.match(route, /ESTADIA_REABIERTA/);
});

test("gestiona el ciclo completo del trabajador mediante correo autorizado", async () => {
  const [schema, route, documents, dashboard, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/api/documents/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0015_bent_mister_sinister.sql"), "utf8"),
  ]);
  assert.match(schema, /lastAccessAt/);
  assert.match(schema, /deactivationReason/);
  assert.match(migration, /ALTER TABLE `users` ADD `last_access_at`/);
  assert.match(migration, /ALTER TABLE `users` ADD `deactivation_reason`/);
  assert.match(route, /INVITACION_CREADA/);
  assert.match(route, /PRIMER_ACCESO/);
  assert.match(route, /SESION_INICIADA/);
  assert.match(route, /8 \* 60 \* 60 \* 1000/);
  assert.match(documents, /activated_at = \?, last_access_at = \?/);
  assert.match(dashboard, /function StaffAccessPanel/);
  assert.match(dashboard, /Historial reciente de accesos/);
});

test("protege propietarios y libera tareas al desactivar trabajadores", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  assert.match(route, /Solo un propietario puede autorizar a otro propietario/);
  assert.match(route, /Debe permanecer al menos un propietario activo/);
  assert.match(route, /Tu propio rol y acceso deben ser administrados por otro propietario/);
  assert.match(route, /UPDATE work_orders SET assigned_user_id = NULL/);
  assert.match(route, /RESPONSABLE_LIBERADO/);
  assert.match(route, /CASE WHEN \? = 'RECEPCION' THEN '' ELSE email END/);
  assert.match(dashboard, /data\.user\.role !== "RECEPCION" && <button className=\{view === "configuracion"/);
  assert.match(dashboard, /Permisos efectivos/);
});

test("crea un expediente contractual y exige respaldo firmado", async () => {
  const [schema, route, documents, dashboard, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/api/documents/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("drizzle/0016_rich_roughhouse.sql"), "utf8"),
  ]);
  assert.match(schema, /export const contracts/);
  assert.match(schema, /contractId: integer\("contract_id"\)/);
  assert.match(migration, /CREATE TABLE `contracts`/);
  assert.match(migration, /ALTER TABLE `documents` ADD `contract_id`/);
  assert.match(route, /body\.action === "contract_create"/);
  assert.match(route, /PENDIENTE_DOCUMENTO/);
  assert.match(documents, /contractId/);
  assert.match(documents, /UPDATE contracts SET status = 'VIGENTE'/);
  assert.match(dashboard, /function ContractManager/);
  assert.match(dashboard, /Expediente contractual/);
});

test("conserva renovaciones, finaliza contratos y alerta vencimientos", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  assert.match(route, /body\.action === "contract_renew"/);
  assert.match(route, /parent_contract_id/);
  assert.match(route, /body\.action === "contract_terminate"/);
  assert.match(route, /CONTRATO_SIN_RESPALDO/);
  assert.match(route, /CONTRATO_VENCIDO/);
  assert.match(route, /CONTRATO_POR_VENCER/);
  assert.match(route, /end_reason = 'Finalización de la estadía'/);
  assert.match(route, /UPDATE contracts SET status = CASE WHEN EXISTS/);
  assert.match(dashboard, /Renovar contrato/);
  assert.match(dashboard, /Finalizar contrato/);
});

test("protege los reportes con roles administrativos activos", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/reports/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  assert.match(route, /role IN \('PROPIETARIO', 'ADMINISTRADOR'\)/);
  assert.match(route, /active = 1/);
  assert.match(route, /status: 403/);
  assert.match(dashboard, /data\.user\.role !== "RECEPCION" && <ReportsView/);
  assert.match(dashboard, /Reportes y exportaciones/);
});

test("exporta CSV seguro para Excel y ofrece un resumen imprimible", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(projectFile("app/api/reports/route.ts"), "utf8"),
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
  ]);
  for (const reportType of ["occupation", "stays", "contracts", "rooms", "staff"]) {
    assert.match(route, new RegExp(`type === "${reportType}"`));
  }
  assert.match(route, /text\/csv; charset=utf-8/);
  assert.match(route, /content-disposition/);
  assert.match(route, /\\uFEFF/);
  assert.match(route, /function safeCsvValue/);
  assert.match(route, /text = "'" \+ text/);
  assert.match(route, /from > to/);
  assert.match(dashboard, /Descargar para Excel/);
  assert.match(dashboard, /Imprimir \/ Guardar PDF/);
  assert.match(dashboard, /window\.print\(\)/);
});

test("carga alertas operativas sin depender de una consulta UNION frágil", async () => {
  const route = await readFile(projectFile("app/api/hotel/route.ts"), "utf8");
  assert.match(route, /async function loadOperationalAlerts/);
  assert.match(route, /groups\.flatMap\(\(group\) => group\.results\)/);
  assert.match(route, /loadOperationalAlerts\(\)/);
  assert.doesNotMatch(route, /CONTRATO_SIN_RESPALDO[\s\S]{0,500}UNION ALL/);
});

test("maneja respuestas vacías de la API y permite reintentar", async () => {
  const dashboard = await readFile(projectFile("app/HotelDashboard.tsx"), "utf8");
  assert.match(dashboard, /async function readJsonResponse/);
  assert.match(dashboard, /await response\.text\(\)/);
  assert.match(dashboard, /Intentar nuevamente/);
  assert.match(dashboard, /No pudimos cargar el hotel/);
});

test("persiste catálogo comercial, ubicaciones, lotes y movimientos", async () => {
  const [schema, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0017_overrated_giant_man.sql"), "utf8"),
  ]);
  assert.match(schema, /export const commercialProducts/);
  assert.match(schema, /export const stockLocations/);
  assert.match(schema, /export const stockBatches/);
  assert.match(schema, /export const stockMovements/);
  assert.match(migration, /CREATE TABLE `commercial_products`/);
  assert.match(migration, /CREATE TABLE `stock_locations`/);
  assert.match(migration, /idx_stock_batches_product_location_expiry/);
  assert.match(migration, /idx_stock_movements_product_created/);
});

test("protege costos y operaciones comerciales según el rol", async () => {
  const route = await readFile(projectFile("app/api/store/route.ts"), "utf8");
  assert.match(route, /user\.role === "PROPIETARIO" \|\| user\.role === "ADMINISTRADOR"/);
  assert.match(route, /Solo Administración puede modificar catálogo o existencias/);
  assert.match(route, /average_cost_cents: null, main_stock: null/);
  assert.match(route, /total_cost_cents: null/);
  assert.match(route, /available < quantity/);
  assert.match(route, /ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END/);
});

test("integra la pantalla de almacén con catálogo, ingresos y transferencias", async () => {
  const [dashboard, store] = await Promise.all([
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
  ]);
  assert.match(dashboard, /<StoreView \/>/);
  assert.match(dashboard, /> Almacén<\/button>/);
  assert.match(store, /Nuevo artículo/);
  assert.match(store, /Ingreso al almacén/);
  assert.match(store, /Reponer recepción/);
  assert.match(store, /Almacén principal \+ Recepción/);
  assert.match(store, /Stock mínimo/);
  assert.match(store, /Vencimientos ≤ 30 días/);
});

test("persiste ventas, detalles, asignaciones de lotes y numeración anual", async () => {
  const [schema, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0018_petite_weapon_omega.sql"), "utf8"),
  ]);
  assert.match(schema, /export const sales/);
  assert.match(schema, /export const saleItems/);
  assert.match(schema, /export const saleStockAllocations/);
  assert.match(schema, /export const commercialSequences/);
  assert.match(migration, /CREATE TABLE `sales`/);
  assert.match(migration, /CREATE TABLE `sale_items`/);
  assert.match(migration, /idx_sales_stay_status/);
  assert.match(migration, /idx_sale_allocations_batch/);
});

test("aplica las reglas del POS sobre stock, pendientes, cortesías y anulaciones", async () => {
  const route = await readFile(projectFile("app/api/store/route.ts"), "utf8");
  assert.match(route, /body\.action === "sale_create"/);
  assert.match(route, /code = 'RECEPTION'/);
  assert.match(route, /date\(expires_on\) >= date\('now'\)/);
  assert.match(route, /ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END/);
  assert.match(route, /pending_limit_cents/);
  assert.match(route, /pendingLimitSetting/);
  assert.match(route, /La cortesía requiere autorización de Administración/);
  assert.match(route, /movement_type, quantity[\s\S]*'VENTA'/);
  assert.match(route, /stockRestored: false/);
});

test("integra carrito, cargos a estadías y comprobantes reimprimibles", async () => {
  const [dashboard, pos, route] = await Promise.all([
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("app/PosView.tsx"), "utf8"),
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
  ]);
  assert.match(dashboard, /<PosView \/>/);
  assert.match(dashboard, /> Ventas<\/button>/);
  assert.match(pos, /Cargo a huésped/);
  assert.match(pos, /Venta directa/);
  assert.match(pos, /Confirmar venta/);
  assert.match(pos, /Cargo pendiente/);
  assert.match(pos, /Imprimir comprobante/);
  assert.match(route, /COMPROBANTE_REIMPRESO/);
  assert.match(route, /Comprobante interno de venta/);
});

test("bloquea la salida mientras existan consumos pendientes", async () => {
  const route = await readFile(projectFile("app/api/hotel/route.ts"), "utf8");
  assert.match(route, /sale\.status IN \('PENDIENTE', 'CORTESIA_PENDIENTE'\)/);
  assert.match(route, /Resuélvelas en Ventas antes de registrar la salida/);
});

test("persiste caja compartida, pagos parciales y devoluciones por producto", async () => {
  const [schema, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0019_cloudy_mikhail_rasputin.sql"), "utf8"),
  ]);
  assert.match(schema, /export const cashSessions/);
  assert.match(schema, /export const salePayments/);
  assert.match(schema, /export const saleReturns/);
  assert.match(schema, /export const saleReturnItems/);
  assert.match(migration, /CREATE TABLE `cash_sessions`/);
  assert.match(migration, /CREATE TABLE `sale_payments`/);
  assert.match(migration, /CREATE TABLE `sale_returns`/);
  assert.match(migration, /Migración de venta pagada existente/);
});

test("controla apertura, cierre y revisión de diferencias de caja", async () => {
  const route = await readFile(projectFile("app/api/store/route.ts"), "utf8");
  assert.match(route, /body\.action === "cash_open"/);
  assert.match(route, /body\.action === "cash_close"/);
  assert.match(route, /expectedCashCents = Number\(session\.opening_cash_cents\)/);
  assert.match(route, /Explica obligatoriamente la diferencia de caja/);
  assert.match(route, /body\.action === "cash_review"/);
  assert.match(route, /Solo Administración puede revisar diferencias de caja/);
  assert.match(route, /Abre la caja de recepción antes de registrar ventas/);
});

test("registra cobros parciales y actualiza el saldo de la estadía", async () => {
  const [storeRoute, hotelRoute] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/api/hotel/route.ts"), "utf8"),
  ]);
  assert.match(storeRoute, /body\.action === "sale_payment"/);
  assert.match(storeRoute, /amountCents > balanceCents/);
  assert.match(storeRoute, /PAGO_REGISTRADO/);
  assert.match(storeRoute, /INSERT INTO sale_payments/);
  assert.match(hotelRoute, /sale_payments payment/);
  assert.match(hotelRoute, /sale_returns ret/);
});

test("permite devoluciones parciales y reintegro expreso al stock", async () => {
  const route = await readFile(projectFile("app/api/store/route.ts"), "utf8");
  assert.match(route, /body\.action === "sale_return"/);
  assert.match(route, /Una cantidad devuelta supera lo disponible/);
  assert.match(route, /Un producto abierto o dañado no puede volver al stock vendible/);
  assert.match(route, /INSERT INTO sale_return_items/);
  assert.match(route, /'DEVOLUCION'/);
  assert.match(route, /returnNumber = `D-/);
});

test("muestra caja, operaciones y rentabilidad solamente a administración", async () => {
  const pos = await readFile(projectFile("app/PosView.tsx"), "utf8");
  assert.match(pos, /Caja compartida abierta/);
  assert.match(pos, /Cerrar y entregar turno/);
  assert.match(pos, /Registrar cobro/);
  assert.match(pos, /Devolver productos/);
  assert.match(pos, /Regresar al stock vendible de recepción/);
  assert.match(pos, /isAdmin && <CommercialReports/);
  assert.match(pos, /Ganancia aproximada/);
});

test("persiste configuración comercial, solicitudes y respaldos de pago", async () => {
  const [schema, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0020_dark_bloodstrike.sql"), "utf8"),
  ]);
  assert.match(schema, /export const commercialSettings/);
  assert.match(schema, /export const replenishmentRequests/);
  assert.match(schema, /export const paymentEvidences/);
  assert.match(migration, /CREATE TABLE `commercial_settings`/);
  assert.match(migration, /CREATE TABLE `replenishment_requests`/);
  assert.match(migration, /CREATE TABLE `payment_evidences`/);
  assert.match(migration, /pending_limit_cents/);
});

test("gestiona solicitudes de reposición con aprobación y salida FEFO", async () => {
  const [route, store] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
  ]);
  assert.match(route, /body\.action === "replenishment_request"/);
  assert.match(route, /body\.action === "replenishment_review"/);
  assert.match(route, /status = 'PENDIENTE'/);
  assert.match(route, /ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END/);
  assert.match(route, /'TRANSFERENCIA'/);
  assert.match(store, /Solicitudes de recepción/);
  assert.match(store, /Aprobar y transferir/);
  assert.match(store, /Cancelar solicitud/);
});

test("registra ajustes positivos y negativos con trazabilidad obligatoria", async () => {
  const [route, store] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
  ]);
  assert.match(route, /body\.action === "stock_adjust"/);
  assert.match(route, /AJUSTE_POSITIVO/);
  assert.match(route, /AJUSTE_NEGATIVO/);
  assert.match(route, /VENCIMIENTO/);
  assert.match(route, /solo dispone de/);
  assert.match(store, /Ajuste o pérdida/);
  assert.match(store, /Pérdida/);
  assert.match(store, /Responsable físico/);
});

test("permite configurar el límite de consumos pendientes", async () => {
  const [route, store] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
  ]);
  assert.match(route, /body\.action === "setting_save"/);
  assert.match(route, /ON CONFLICT\(key\) DO UPDATE/);
  assert.match(route, /El límite debe estar entre Bs 0 y Bs 10\.000/);
  assert.match(store, /Límite pendiente por estadía/);
  assert.match(store, /Los saldos ya existentes no se modifican/);
});

test("carga y consulta respaldos privados para pagos digitales", async () => {
  const [route, pos] = await Promise.all([
    readFile(projectFile("app/api/payment-evidence/route.ts"), "utf8"),
    readFile(projectFile("app/PosView.tsx"), "utf8"),
  ]);
  assert.match(route, /env\.FILES\.put/);
  assert.match(route, /env\.FILES\.get/);
  assert.match(route, /15 \* 1024 \* 1024/);
  assert.match(route, /TRANSFERENCIA/);
  assert.match(route, /RESPALDO_PAGO_CARGADO/);
  assert.match(pos, /uploadPaymentEvidences/);
  assert.match(pos, /Captura o PDF/);
  assert.match(pos, /Sin respaldo/);
});

test("persiste servicios, revisión de cortesías y comprobantes de compra", async () => {
  const [schema, migration] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0021_ambiguous_orphan.sql"), "utf8"),
  ]);
  assert.match(schema, /itemType: text\("item_type"/);
  assert.match(schema, /CORTESIA_PENDIENTE/);
  assert.match(schema, /courtesyReviewedByName/);
  assert.match(schema, /receiptObjectKey/);
  assert.match(migration, /services_enabled/);
  assert.match(migration, /ADD `item_type`/);
  assert.match(migration, /ADD `receipt_object_key`/);
});

test("vende servicios sin existencias y mantiene el módulo bajo llave", async () => {
  const [route, store, pos] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
    readFile(projectFile("app/PosView.tsx"), "utf8"),
  ]);
  assert.match(route, /body\.action === "services_toggle"/);
  assert.match(route, /user\.role !== "PROPIETARIO"/);
  assert.match(route, /product\.item_type === "SERVICIO"/);
  assert.match(route, /Los servicios no reciben existencias físicas/);
  assert.match(store, /Activar módulo de servicios/);
  assert.match(pos, /Productos y servicios/);
  assert.match(pos, /sin existencias/);
});

test("solicita y resuelve cortesías antes de descontar stock", async () => {
  const [route, pos] = await Promise.all([
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/PosView.tsx"), "utf8"),
  ]);
  assert.match(route, /courtesyPending = paymentMethod === "CORTESIA" && !isAdministrator\(user\)/);
  assert.match(route, /body\.action === "courtesy_review"/);
  assert.match(route, /CORTESIA_RECHAZADA/);
  assert.match(route, /Repón stock antes de aprobar/);
  assert.match(route, /if \(!courtesyPending\) allocations\.forEach/);
  assert.match(pos, /Solicitar cortesía/);
  assert.match(pos, /Cortesías por aprobar/);
  assert.match(pos, /Aprobar cortesía/);
});

test("respalda ingresos de almacén con proveedor y archivo privado", async () => {
  const [route, storeRoute, store] = await Promise.all([
    readFile(projectFile("app/api/stock-entry-evidence/route.ts"), "utf8"),
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/StoreView.tsx"), "utf8"),
  ]);
  assert.match(route, /Solo Administración puede cargar comprobantes de compra/);
  assert.match(route, /env\.FILES\.put/);
  assert.match(route, /receipt_object_key/);
  assert.match(route, /COMPROBANTE_COMPRA_CARGADO/);
  assert.match(storeRoute, /supplier, receipt_number/);
  assert.match(storeRoute, /movementId/);
  assert.match(store, /Fotografía o PDF del comprobante/);
  assert.match(store, /Ver comprobante de compra/);
});

test("exporta reportes comerciales seguros y ofrece comprobantes térmicos", async () => {
  const [reports, storeRoute, pos] = await Promise.all([
    readFile(projectFile("app/api/commercial-reports/route.ts"), "utf8"),
    readFile(projectFile("app/api/store/route.ts"), "utf8"),
    readFile(projectFile("app/PosView.tsx"), "utf8"),
  ]);
  assert.match(reports, /type === "sales"/);
  assert.match(reports, /type === "inventory"/);
  assert.match(reports, /\\uFEFF/);
  assert.match(reports, /text = `'\$\{text\}`/);
  assert.match(storeRoute, /format === "thermal"/);
  assert.match(storeRoute, /Firma del cliente \/ huésped/);
  assert.match(pos, /Exportar ventas/);
  assert.match(pos, /Ventas por huésped y habitación/);
});

test("restringe Patrimonio Base a propietarios y administradores", async () => {
  const [dashboard, route] = await Promise.all([
    readFile(projectFile("app/HotelDashboard.tsx"), "utf8"),
    readFile(projectFile("app/api/patrimony/route.ts"), "utf8"),
  ]);
  assert.match(dashboard, /data\.user\.role !== "RECEPCION".+Patrimonio/);
  assert.match(route, /role IN \('PROPIETARIO', 'ADMINISTRADOR'\)/);
  assert.match(route, /Patrimonio Base está disponible únicamente para Administración/);
  assert.match(route, /COBRO_PATRIMONIAL_REGISTRADO/);
  assert.match(route, /GASTO_PATRIMONIAL_REGISTRADO/);
});

test("persiste propiedades, inquilinos, cobros, gastos y distribución patrimonial", async () => {
  const [schema, migration, view, operations] = await Promise.all([
    readFile(projectFile("db/schema.ts"), "utf8"),
    readFile(projectFile("drizzle/0022_sturdy_rockslide.sql"), "utf8"),
    readFile(projectFile("app/PatrimonyView.tsx"), "utf8"),
    readFile(projectFile("app/PatrimonyOperations.tsx"), "utf8"),
  ]);
  assert.match(schema, /patrimonyProperties/);
  assert.match(schema, /patrimonyTenants/);
  assert.match(schema, /patrimonyPayments/);
  assert.match(schema, /patrimonyExpenses/);
  assert.match(migration, /CREATE TABLE .patrimony_distribution./);
  assert.match(migration, /CREATE TABLE .patrimony_properties./);
  assert.match(view, /Acceso administrativo restringido/);
  assert.match(operations, /Todo gasto entra pendiente/);
  assert.match(operations, /La suma debe ser exactamente 100%/);
});
