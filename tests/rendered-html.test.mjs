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
