import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const floors = sqliteTable("floors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  floorId: integer("floor_id").notNull(),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"] }).notNull(),
  notes: text("notes").notNull(),
}, (table) => [index("idx_rooms_floor_id").on(table.floorId)]);

export const guests = sqliteTable("guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  ci: text("ci"),
  phone: text("phone"),
  isMinor: integer("is_minor", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const stays = sqliteTable("stays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  primaryGuestId: integer("primary_guest_id").notNull(),
  stayType: text("stay_type", { enum: ["DIA", "SEMANA", "MES", "ARRENDAMIENTO"] }).notNull(),
  checkIn: text("check_in").notNull(),
  expectedCheckOut: text("expected_check_out"),
  checkOut: text("check_out"),
  status: text("status", { enum: ["ACTIVA", "FINALIZADA"] }).notNull(),
  notes: text("notes").notNull(),
}, (table) => [index("idx_stays_room_status").on(table.roomId, table.status)]);

export const stayGuests = sqliteTable("stay_guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  guestId: integer("guest_id").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
});

export const roomEvents = sqliteTable("room_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  stayId: integer("stay_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_events_room_created").on(table.roomId, table.createdAt)]);

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  stayId: integer("stay_id"),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_documents_stay_id").on(table.stayId)]);

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_inventory_room_id").on(table.roomId)]);

export const inspections = sqliteTable("inspections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  kind: text("kind", { enum: ["ENTREGA", "DEVOLUCION"] }).notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_inspections_stay_kind").on(table.stayId, table.kind)]);

export const inspectionItems = sqliteTable("inspection_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inspectionId: integer("inspection_id").notNull(),
  inventoryItemId: integer("inventory_item_id"),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  condition: text("condition", { enum: ["BUENO", "OBSERVADO", "FALTANTE"] }).notNull(),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_inspection_items_inspection").on(table.inspectionId)]);
