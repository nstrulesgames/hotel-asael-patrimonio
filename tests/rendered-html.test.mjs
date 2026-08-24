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
