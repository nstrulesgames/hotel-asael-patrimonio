import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL("../" + path, import.meta.url);

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
