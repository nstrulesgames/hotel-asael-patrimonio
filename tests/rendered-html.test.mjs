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
