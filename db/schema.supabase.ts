// Archivo generado desde db/schema.ts.
// Ejecuta `npm run db:generate:supabase` después de cambiar el esquema D1.
import { boolean, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"] }).notNull(),
  active: boolean("active").notNull().default(true),
  invitedBy: text("invited_by"),
  activatedAt: text("activated_at"),
  lastAccessAt: text("last_access_at"),
  deactivatedAt: text("deactivated_at"),
  deactivatedBy: text("deactivated_by"),
  deactivationReason: text("deactivation_reason"),
  createdAt: text("created_at").notNull(),
});

export const userAccessEvents = pgTable("user_access_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  performedBy: text("performed_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_user_access_events_user").on(table.userId, table.createdAt)]);

export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  active: boolean("active").notNull().default(true),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  floorId: integer("floor_id").notNull(),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO", "FUERA_SERVICIO"] }).notNull(),
  notes: text("notes").notNull(),
  active: boolean("active").notNull().default(true),
}, (table) => [index("idx_rooms_floor_id").on(table.floorId)]);

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  ci: text("ci"),
  phone: text("phone"),
  isMinor: boolean("is_minor").notNull(),
  identificationPending: boolean("identification_pending").notNull().default(false),
  updatedAt: text("updated_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_guests_ci").on(table.ci)]);

export const stays = pgTable("stays", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  primaryGuestId: integer("primary_guest_id").notNull(),
  stayType: text("stay_type", { enum: ["DIA", "SEMANA", "MES", "ARRENDAMIENTO"] }).notNull(),
  checkIn: text("check_in").notNull(),
  expectedCheckOut: text("expected_check_out"),
  checkOut: text("check_out"),
  status: text("status", { enum: ["ACTIVA", "FINALIZADA"] }).notNull(),
  notes: text("notes").notNull(),
  capacityOverride: boolean("capacity_override").notNull().default(false),
  capacityOverrideReason: text("capacity_override_reason"),
  capacityAuthorizedBy: text("capacity_authorized_by"),
}, (table) => [index("idx_stays_room_status").on(table.roomId, table.status)]);

export const stayRoomSegments = pgTable("stay_room_segments", {
  id: serial("id").primaryKey(),
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

export const stayGuests = pgTable("stay_guests", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  guestId: integer("guest_id").notNull(),
  isPrimary: boolean("is_primary").notNull(),
  joinedAt: text("joined_at"),
  leftAt: text("left_at"),
  addedBy: text("added_by"),
  removedBy: text("removed_by"),
  removalReason: text("removal_reason"),
}, (table) => [index("idx_stay_guests_stay_active").on(table.stayId, table.leftAt)]);

export const primaryGuestTransfers = pgTable("primary_guest_transfers", {
  id: serial("id").primaryKey(),
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

export const exitAssessments = pgTable("exit_assessments", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  deliveryInspectionId: integer("delivery_inspection_id").notNull(),
  returnInspectionId: integer("return_inspection_id").notNull(),
  workOrderId: integer("work_order_id"),
  issueCount: integer("issue_count").notNull().default(0),
  missingCount: integer("missing_count").notNull().default(0),
  observedCount: integer("observed_count").notNull().default(0),
  discrepancies: text("discrepancies").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["SIN_OBSERVACIONES", "PENDIENTE", "APROBADA", "RECHAZADA"] }).notNull(),
  submittedByUserId: integer("submitted_by_user_id").notNull(),
  submittedByName: text("submitted_by_name").notNull(),
  submittedAt: text("submitted_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
}, (table) => [index("idx_exit_assessments_status_submitted").on(table.status, table.submittedAt), index("idx_exit_assessments_segment_submitted").on(table.segmentId, table.submittedAt)]);

export const exceptionalExitRequests = pgTable("exceptional_exit_requests", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  reason: text("reason").notNull(),
  witnesses: text("witnesses").notNull().default(""),
  photoCount: integer("photo_count").notNull().default(0),
  status: text("status", { enum: ["PENDIENTE", "APROBADA", "RECHAZADA"] }).notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: text("requested_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
}, (table) => [index("idx_exceptional_exit_status_requested").on(table.status, table.requestedAt), index("idx_exceptional_exit_segment_requested").on(table.segmentId, table.requestedAt)]);

export const roomEvents = pgTable("room_events", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  stayId: integer("stay_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_events_room_created").on(table.roomId, table.createdAt)]);

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  primaryGuestId: integer("primary_guest_id").notNull(),
  initialRoomId: integer("initial_room_id").notNull(),
  parentContractId: integer("parent_contract_id"),
  contractNumber: text("contract_number").notNull(),
  contractType: text("contract_type", { enum: ["ARRENDAMIENTO", "ALOJAMIENTO", "OTRO"] }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status", { enum: ["PENDIENTE_DOCUMENTO", "VIGENTE", "RENOVADO", "FINALIZADO"] }).notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  endedBy: text("ended_by"),
  endedAt: text("ended_at"),
  endReason: text("end_reason"),
}, (table) => [index("idx_contracts_stay_status").on(table.stayId, table.status), index("idx_contracts_end_status").on(table.endDate, table.status)]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  stayId: integer("stay_id"),
  segmentId: integer("segment_id"),
  workOrderId: integer("work_order_id"),
  inventoryMovementId: integer("inventory_movement_id"),
  contractId: integer("contract_id"),
  phase: text("phase", { enum: ["GENERAL", "ENTREGA", "DURANTE", "DEVOLUCION", "LIMPIEZA", "MANTENIMIENTO"] }).notNull().default("GENERAL"),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  uploadedBy: text("uploaded_by").notNull().default("Hotel ASAEL"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_documents_stay_id").on(table.stayId), index("idx_documents_segment_id").on(table.segmentId), index("idx_documents_work_order_id").on(table.workOrderId), index("idx_documents_inventory_movement_id").on(table.inventoryMovementId), index("idx_documents_contract_id").on(table.contractId)]);

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  itemType: text("item_type", { enum: ["PERMANENTE", "REUTILIZABLE"] }).notNull().default("PERMANENTE"),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_inventory_room_id").on(table.roomId)]);

export const roomInfrastructureItems = pgTable("room_infrastructure_items", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  area: text("area").notNull(),
  name: text("name").notNull(),
  evidenceCategory: text("evidence_category").notNull(),
  requiredEvidence: boolean("required_evidence").notNull().default(true),
  active: boolean("active").notNull().default(true),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_room_infrastructure_room_active").on(table.roomId, table.active)]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  inventoryItemId: integer("inventory_item_id"),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  movementType: text("movement_type", { enum: ["ENTREGA", "RETIRO", "REEMPLAZO"] }).notNull(),
  reason: text("reason").notNull(),
  responsible: text("responsible").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_inventory_movements_segment_created").on(table.segmentId, table.createdAt), index("idx_inventory_movements_room_created").on(table.roomId, table.createdAt)]);

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  stayId: integer("stay_id").notNull(),
  roomId: integer("room_id").notNull(),
  segmentId: integer("segment_id"),
  kind: text("kind", { enum: ["ENTREGA", "DEVOLUCION", "LIMPIEZA_FINAL"] }).notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_inspections_stay_kind").on(table.stayId, table.kind), index("idx_inspections_segment_kind").on(table.segmentId, table.kind)]);

export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull(),
  inventoryItemId: integer("inventory_item_id"),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  condition: text("condition", { enum: ["BUENO", "OBSERVADO", "FALTANTE"] }).notNull(),
  notes: text("notes").notNull().default(""),
}, (table) => [index("idx_inspection_items_inspection").on(table.inspectionId)]);

export const roomTurnovers = pgTable("room_turnovers", {
  id: serial("id").primaryKey(),
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

export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
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
  blocksRoom: boolean("blocks_room").notNull().default(false),
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

export const workOrderHistory = pgTable("work_order_history", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  detail: text("detail").notNull().default(""),
  performedBy: text("performed_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_work_order_history_order_created").on(table.workOrderId, table.createdAt)]);

export const changeRequests = pgTable("change_requests", {
  id: serial("id").primaryKey(),
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

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
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

export const commercialProducts = pgTable("commercial_products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("OTROS"),
  itemType: text("item_type", { enum: ["PRODUCTO", "SERVICIO"] }).notNull().default("PRODUCTO"),
  purchaseUnit: text("purchase_unit").notNull(),
  saleUnit: text("sale_unit").notNull(),
  unitsPerPurchase: integer("units_per_purchase").notNull().default(1),
  salePriceCents: integer("sale_price_cents").notNull().default(0),
  averageCostCents: integer("average_cost_cents").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  tracksExpiry: boolean("tracks_expiry").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at"),
}, (table) => [index("idx_commercial_products_active_name").on(table.active, table.name)]);

export const stockLocations = pgTable("stock_locations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const stockBatches = pgTable("stock_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  locationId: integer("location_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  expiresOn: text("expires_on"),
  receivedAt: text("received_at").notNull(),
  createdBy: text("created_by").notNull(),
}, (table) => [index("idx_stock_batches_product_location_expiry").on(table.productId, table.locationId, table.expiresOn)]);

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  movementType: text("movement_type", { enum: ["ENTRADA", "TRANSFERENCIA", "AJUSTE_POSITIVO", "AJUSTE_NEGATIVO", "VENCIMIENTO", "DEVOLUCION", "VENTA"] }).notNull(),
  quantity: integer("quantity").notNull(),
  totalCostCents: integer("total_cost_cents").notNull().default(0),
  reason: text("reason").notNull(),
  responsible: text("responsible").notNull(),
  supplier: text("supplier"),
  receiptNumber: text("receipt_number"),
  receiptFilename: text("receipt_filename"),
  receiptObjectKey: text("receipt_object_key"),
  receiptContentType: text("receipt_content_type"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_stock_movements_product_created").on(table.productId, table.createdAt), index("idx_stock_movements_locations_created").on(table.fromLocationId, table.toLocationId, table.createdAt)]);

export const commercialSequences = pgTable("commercial_sequences", {
  year: integer("year").primaryKey(),
  nextValue: integer("next_value").notNull().default(1),
});

export const commercialSettings = pgTable("commercial_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedByUserId: integer("updated_by_user_id"),
  updatedByName: text("updated_by_name"),
  updatedAt: text("updated_at").notNull(),
});

export const replenishmentRequests = pgTable("replenishment_requests", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["PENDIENTE", "APROBADA", "RECHAZADA", "CANCELADA"] }).notNull().default("PENDIENTE"),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: text("requested_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  fulfilledMovementId: integer("fulfilled_movement_id"),
}, (table) => [index("idx_replenishment_status_requested").on(table.status, table.requestedAt), index("idx_replenishment_product_status").on(table.productId, table.status)]);

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(),
  saleYear: integer("sale_year").notNull(),
  sequence: integer("sequence").notNull(),
  saleType: text("sale_type", { enum: ["HUESPED", "DIRECTA"] }).notNull(),
  stayId: integer("stay_id"),
  roomId: integer("room_id"),
  consumerGuestId: integer("consumer_guest_id"),
  customerName: text("customer_name"),
  customerCi: text("customer_ci"),
  customerPhone: text("customer_phone"),
  status: text("status", { enum: ["PAGADA", "PENDIENTE", "ANULADA", "DEVUELTA", "CORTESIA_PENDIENTE", "CORTESIA_RECHAZADA"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["EFECTIVO", "TRANSFERENCIA", "QR", "PENDIENTE", "CORTESIA", "OTRO"] }).notNull(),
  cashSessionId: integer("cash_session_id"),
  subtotalCents: integer("subtotal_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  notes: text("notes").notNull().default(""),
  printCount: integer("print_count").notNull().default(0),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  cancelledByUserId: integer("cancelled_by_user_id"),
  cancelledByName: text("cancelled_by_name"),
  cancelledAt: text("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  courtesyReviewedByUserId: integer("courtesy_reviewed_by_user_id"),
  courtesyReviewedByName: text("courtesy_reviewed_by_name"),
  courtesyReviewedAt: text("courtesy_reviewed_at"),
  courtesyReviewNote: text("courtesy_review_note"),
}, (table) => [index("idx_sales_stay_status").on(table.stayId, table.status), index("idx_sales_created_status").on(table.createdAt, table.status)]);

export const cashSessions = pgTable("cash_sessions", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["ABIERTA", "CERRADA", "PENDIENTE_REVISION", "REVISADA"] }).notNull().default("ABIERTA"),
  openedByUserId: integer("opened_by_user_id").notNull(),
  openedByName: text("opened_by_name").notNull(),
  openedAt: text("opened_at").notNull(),
  openingCashCents: integer("opening_cash_cents").notNull(),
  openingNotes: text("opening_notes").notNull().default(""),
  closedByUserId: integer("closed_by_user_id"),
  closedByName: text("closed_by_name"),
  closedAt: text("closed_at"),
  expectedCashCents: integer("expected_cash_cents"),
  countedCashCents: integer("counted_cash_cents"),
  differenceCents: integer("difference_cents"),
  differenceReason: text("difference_reason"),
  closingNotes: text("closing_notes"),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
}, (table) => [index("idx_cash_sessions_status_opened").on(table.status, table.openedAt)]);

export const salePayments = pgTable("sale_payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  cashSessionId: integer("cash_session_id"),
  paymentMethod: text("payment_method", { enum: ["EFECTIVO", "TRANSFERENCIA", "QR", "CORTESIA", "OTRO"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  reference: text("reference").notNull().default(""),
  receivedByUserId: integer("received_by_user_id").notNull(),
  receivedByName: text("received_by_name").notNull(),
  receivedAt: text("received_at").notNull(),
}, (table) => [index("idx_sale_payments_sale_received").on(table.saleId, table.receivedAt), index("idx_sale_payments_session_method").on(table.cashSessionId, table.paymentMethod)]);

export const paymentEvidences = pgTable("payment_evidences", {
  id: serial("id").primaryKey(),
  salePaymentId: integer("sale_payment_id").notNull(),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_payment_evidences_payment").on(table.salePaymentId)]);

export const saleReturns = pgTable("sale_returns", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  returnNumber: text("return_number").unique(),
  reason: text("reason").notNull(),
  responsible: text("responsible").notNull(),
  physicalCondition: text("physical_condition", { enum: ["SELLADO", "BUENO", "ABIERTO", "DANADO"] }).notNull(),
  returnsToStock: boolean("returns_to_stock").notNull().default(false),
  refundMethod: text("refund_method", { enum: ["EFECTIVO", "TRANSFERENCIA", "QR", "SALDO", "SIN_REEMBOLSO", "OTRO"] }).notNull(),
  refundAmountCents: integer("refund_amount_cents").notNull().default(0),
  cashSessionId: integer("cash_session_id"),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_sale_returns_sale_created").on(table.saleId, table.createdAt), index("idx_sale_returns_session_method").on(table.cashSessionId, table.refundMethod)]);

export const saleReturnItems = pgTable("sale_return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull(),
  saleItemId: integer("sale_item_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  totalPriceCents: integer("total_price_cents").notNull(),
}, (table) => [index("idx_sale_return_items_return").on(table.returnId), index("idx_sale_return_items_sale_item").on(table.saleItemId)]);

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productSku: text("product_sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  totalPriceCents: integer("total_price_cents").notNull(),
  totalCostCents: integer("total_cost_cents").notNull(),
}, (table) => [index("idx_sale_items_sale").on(table.saleId)]);

export const saleStockAllocations = pgTable("sale_stock_allocations", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  batchId: integer("batch_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
}, (table) => [index("idx_sale_allocations_sale").on(table.saleId), index("idx_sale_allocations_batch").on(table.batchId)]);

export const patrimonyProperties = pgTable("patrimony_properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  propertyType: text("property_type").notNull(),
  address: text("address").notNull().default(""),
  unitCount: integer("unit_count").notNull().default(0),
  monthlyPotentialCents: integer("monthly_potential_cents").notNull().default(0),
  status: text("status", { enum: ["PRODUCTIVA", "VACANTE", "LITIGIO", "DISPUTA", "OPORTUNIDAD", "INACTIVA"] }).notNull().default("PRODUCTIVA"),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => [index("idx_patrimony_properties_status").on(table.active, table.status)]);

export const patrimonyTenants = pgTable("patrimony_tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  unitName: text("unit_name").notNull(),
  fullName: text("full_name").notNull(),
  ci: text("ci"),
  phone: text("phone"),
  monthlyRentCents: integer("monthly_rent_cents").notNull().default(0),
  paymentDay: integer("payment_day").notNull(),
  contractStart: text("contract_start"),
  contractEnd: text("contract_end"),
  status: text("status", { enum: ["ACTIVO", "PENDIENTE", "VENCIDO", "FINALIZADO"] }).notNull().default("ACTIVO"),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => [index("idx_patrimony_tenants_property_active").on(table.propertyId, table.active)]);

export const patrimonyPayments = pgTable("patrimony_payments", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id"),
  paidOn: text("paid_on").notNull(),
  concept: text("concept").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paymentMethod: text("payment_method", { enum: ["EFECTIVO", "TRANSFERENCIA", "QR", "OTRO"] }).notNull(),
  status: text("status", { enum: ["CONCILIADO", "VERIFICADO", "PENDIENTE", "ANULADO"] }).notNull().default("CONCILIADO"),
  reference: text("reference").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_patrimony_payments_property_date").on(table.propertyId, table.paidOn), index("idx_patrimony_payments_tenant_date").on(table.tenantId, table.paidOn)]);

export const patrimonyExpenses = pgTable("patrimony_expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  incurredOn: text("incurred_on").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["PENDIENTE", "APROBADO", "RECHAZADO"] }).notNull().default("PENDIENTE"),
  evidenceNote: text("evidence_note").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
}, (table) => [index("idx_patrimony_expenses_property_date").on(table.propertyId, table.incurredOn), index("idx_patrimony_expenses_status_date").on(table.status, table.incurredOn)]);

export const patrimonyDistribution = pgTable("patrimony_distribution", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  percentage: integer("percentage").notNull(),
  position: integer("position").notNull(),
  updatedByUserId: integer("updated_by_user_id"),
  updatedByName: text("updated_by_name"),
  updatedAt: text("updated_at").notNull(),
});
