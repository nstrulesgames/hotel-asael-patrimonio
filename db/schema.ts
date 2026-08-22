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

export const userAccessEvents = sqliteTable("user_access_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  performedBy: text("performed_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_user_access_events_user").on(table.userId, table.createdAt)]);

export const floors = sqliteTable("floors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  floorId: integer("floor_id").notNull(),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"] }).notNull(),
  notes: text("notes").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (table) => [index("idx_rooms_floor_id").on(table.floorId)]);

export const guests = sqliteTable("guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  ci: text("ci"),
  phone: text("phone"),
  isMinor: integer("is_minor", { mode: "boolean" }).notNull(),
  identificationPending: integer("identification_pending", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_guests_ci").on(table.ci)]);

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
  capacityOverride: integer("capacity_override", { mode: "boolean" }).notNull().default(false),
  capacityOverrideReason: text("capacity_override_reason"),
  capacityAuthorizedBy: text("capacity_authorized_by"),
}, (table) => [index("idx_stays_room_status").on(table.roomId, table.status)]);

export const stayRoomSegments = sqliteTable("stay_room_segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  sequence: integer("sequence").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  startReason: text("start_reason").notNull(),
  endReason: text("end_reason"),
  createdBy: text("created_by").notNull(),
  endedBy: text("ended_by"),
}, (table) => [index("idx_stay_segments_stay_sequence").on(table.stayId, table.sequence)]);

export const stayGuests = sqliteTable("stay_guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  guestId: integer("guest_id").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
  joinedAt: text("joined_at"),
  leftAt: text("left_at"),
  addedBy: text("added_by"),
  removedBy: text("removed_by"),
  removalReason: text("removal_reason"),
}, (table) => [index("idx_stay_guests_stay_active").on(table.stayId, table.leftAt)]);

export const primaryGuestTransfers = sqliteTable("primary_guest_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  previousGuestId: integer("previous_guest_id").notNull(),
  proposedGuestId: integer("proposed_guest_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["PENDIENTE", "APROBADA", "RECHAZADA"] }).notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: text("requested_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  appliedAt: text("applied_at"),
}, (table) => [index("idx_primary_transfers_status_requested").on(table.status, table.requestedAt), index("idx_primary_transfers_stay_requested").on(table.stayId, table.requestedAt)]);

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
  segmentId: integer("segment_id"),
  workOrderId: integer("work_order_id"),
  phase: text("phase", { enum: ["GENERAL", "ENTREGA", "DEVOLUCION"] }).notNull().default("GENERAL"),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  uploadedBy: text("uploaded_by").notNull().default("Hotel ASAEL"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_documents_stay_id").on(table.stayId), index("idx_documents_segment_id").on(table.segmentId), index("idx_documents_work_order_id").on(table.workOrderId)]);

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
  segmentId: integer("segment_id"),
  kind: text("kind", { enum: ["ENTREGA", "DEVOLUCION", "LIMPIEZA_FINAL"] }).notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_inspections_stay_kind").on(table.stayId, table.kind), index("idx_inspections_segment_kind").on(table.segmentId, table.kind)]);

export const inspectionItems = sqliteTable("inspection_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inspectionId: integer("inspection_id").notNull(),
  inventoryItemId: integer("inventory_item_id"),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  condition: text("condition", { enum: ["BUENO", "OBSERVADO", "FALTANTE"] }).notNull(),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_inspection_items_inspection").on(table.inspectionId)]);

export const roomTurnovers = sqliteTable("room_turnovers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  segmentId: integer("segment_id"),
  status: text("status", { enum: ["PENDIENTE", "EN_LIMPIEZA", "PENDIENTE_INSPECCION", "OBSERVADO", "COMPLETADO"] }).notNull(),
  cleaningStartedAt: text("cleaning_started_at"),
  cleaningStartedBy: text("cleaning_started_by"),
  cleaningCompletedAt: text("cleaning_completed_at"),
  cleaningCompletedBy: text("cleaning_completed_by"),
  finalInspectionId: integer("final_inspection_id"),
  approvedAt: text("approved_at"),
  approvedBy: text("approved_by"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_turnovers_room_status").on(table.roomId, table.status)]);

export const workOrders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  stayId: integer("stay_id"),
  segmentId: integer("segment_id"),
  type: text("type", { enum: ["LIMPIEZA", "MANTENIMIENTO", "REPARACION", "MUEBLES", "DANO", "OTRO"] }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  priority: text("priority", { enum: ["BAJA", "MEDIA", "ALTA", "URGENTE"] }).notNull(),
  status: text("status", { enum: ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADO"] }).notNull(),
  assignedUserId: integer("assigned_user_id"),
  dueAt: text("due_at"),
  blocksRoom: integer("blocks_room", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  startedBy: text("started_by"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  cancelledAt: text("cancelled_at"),
  cancelledBy: text("cancelled_by"),
  cancellationReason: text("cancellation_reason"),
}, (table) => [index("idx_work_orders_room_status").on(table.roomId, table.status), index("idx_work_orders_status_priority").on(table.status, table.priority)]);

export const workOrderHistory = sqliteTable("work_order_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrderId: integer("work_order_id").notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  detail: text("detail").notNull().default(""),
  performedBy: text("performed_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_work_order_history_order_created").on(table.workOrderId, table.createdAt)]);

export const changeRequests = sqliteTable("change_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  entityType: text("entity_type", { enum: ["GUEST", "STAY"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  proposedValue: text("proposed_value"),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["PENDIENTE", "APROBADA", "RECHAZADA"] }).notNull(),
  applicationMode: text("application_mode", { enum: ["DIRECTA", "APROBACION"] }).notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: text("requested_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  appliedAt: text("applied_at"),
}, (table) => [index("idx_change_requests_status_requested").on(table.status, table.requestedAt), index("idx_change_requests_entity_field").on(table.entityType, table.entityId, table.fieldName)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  roomId: integer("room_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason").notNull().default(""),
  approvalRequestId: integer("approval_request_id"),
  sessionInfo: text("session_info"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_audit_logs_created").on(table.createdAt), index("idx_audit_logs_room_created").on(table.roomId, table.createdAt)]);
