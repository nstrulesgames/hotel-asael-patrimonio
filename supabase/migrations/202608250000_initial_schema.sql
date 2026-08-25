CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"room_id" integer,
	"old_value" text,
	"new_value" text,
	"reason" text DEFAULT '' NOT NULL,
	"approval_request_id" integer,
	"session_info" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ABIERTA' NOT NULL,
	"opened_by_user_id" integer NOT NULL,
	"opened_by_name" text NOT NULL,
	"opened_at" text NOT NULL,
	"opening_cash_cents" integer NOT NULL,
	"opening_notes" text DEFAULT '' NOT NULL,
	"closed_by_user_id" integer,
	"closed_by_name" text,
	"closed_at" text,
	"expected_cash_cents" integer,
	"counted_cash_cents" integer,
	"difference_cents" integer,
	"difference_reason" text,
	"closing_notes" text,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"proposed_value" text,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"application_mode" text NOT NULL,
	"requested_by_user_id" integer NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text,
	"applied_at" text
);
--> statement-breakpoint
CREATE TABLE "commercial_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'OTROS' NOT NULL,
	"item_type" text DEFAULT 'PRODUCTO' NOT NULL,
	"purchase_unit" text NOT NULL,
	"sale_unit" text NOT NULL,
	"units_per_purchase" integer DEFAULT 1 NOT NULL,
	"sale_price_cents" integer DEFAULT 0 NOT NULL,
	"average_cost_cents" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"tracks_expiry" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_by" text,
	"updated_at" text,
	CONSTRAINT "commercial_products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "commercial_sequences" (
	"year" integer PRIMARY KEY NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_by_user_id" integer,
	"updated_by_name" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"primary_guest_id" integer NOT NULL,
	"initial_room_id" integer NOT NULL,
	"parent_contract_id" integer,
	"contract_number" text NOT NULL,
	"contract_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"ended_by" text,
	"ended_at" text,
	"end_reason" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"stay_id" integer,
	"segment_id" integer,
	"work_order_id" integer,
	"inventory_movement_id" integer,
	"contract_id" integer,
	"phase" text DEFAULT 'GENERAL' NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"filename" text NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"uploaded_by" text DEFAULT 'Hotel ASAEL' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exceptional_exit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"segment_id" integer NOT NULL,
	"reason" text NOT NULL,
	"witnesses" text DEFAULT '' NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"requested_by_user_id" integer NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "exit_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"segment_id" integer NOT NULL,
	"delivery_inspection_id" integer NOT NULL,
	"return_inspection_id" integer NOT NULL,
	"work_order_id" integer,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"missing_count" integer DEFAULT 0 NOT NULL,
	"observed_count" integer DEFAULT 0 NOT NULL,
	"discrepancies" text DEFAULT '[]' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"submitted_by_name" text NOT NULL,
	"submitted_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"ci" text,
	"phone" text,
	"is_minor" boolean NOT NULL,
	"identification_pending" boolean DEFAULT false NOT NULL,
	"updated_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_id" integer NOT NULL,
	"inventory_item_id" integer,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"condition" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"segment_id" integer,
	"kind" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"item_type" text DEFAULT 'PERMANENTE' NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"segment_id" integer NOT NULL,
	"inventory_item_id" integer,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"movement_type" text NOT NULL,
	"reason" text NOT NULL,
	"responsible" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patrimony_distribution" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"percentage" integer NOT NULL,
	"position" integer NOT NULL,
	"updated_by_user_id" integer,
	"updated_by_name" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patrimony_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"incurred_on" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'PENDIENTE' NOT NULL,
	"evidence_note" text NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "patrimony_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"tenant_id" integer,
	"paid_on" text NOT NULL,
	"concept" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'CONCILIADO' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patrimony_properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"property_type" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"unit_count" integer DEFAULT 0 NOT NULL,
	"monthly_potential_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PRODUCTIVA' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "patrimony_tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"unit_name" text NOT NULL,
	"full_name" text NOT NULL,
	"ci" text,
	"phone" text,
	"monthly_rent_cents" integer DEFAULT 0 NOT NULL,
	"payment_day" integer NOT NULL,
	"contract_start" text,
	"contract_end" text,
	"status" text DEFAULT 'ACTIVO' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "payment_evidences" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_payment_id" integer NOT NULL,
	"filename" text NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"uploaded_by_user_id" integer NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primary_guest_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"previous_guest_id" integer NOT NULL,
	"proposed_guest_id" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"requested_by_user_id" integer NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text,
	"applied_at" text
);
--> statement-breakpoint
CREATE TABLE "replenishment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"requested_quantity" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'PENDIENTE' NOT NULL,
	"requested_by_user_id" integer NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_at" text NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_by_name" text,
	"reviewed_at" text,
	"review_note" text,
	"fulfilled_movement_id" integer
);
--> statement-breakpoint
CREATE TABLE "room_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"stay_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"status" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_infrastructure_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"area" text NOT NULL,
	"name" text NOT NULL,
	"evidence_category" text NOT NULL,
	"required_evidence" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_turnovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"segment_id" integer,
	"status" text NOT NULL,
	"cleaning_started_at" text,
	"cleaning_started_by" text,
	"cleaning_completed_at" text,
	"cleaning_completed_by" text,
	"final_inspection_id" integer,
	"approved_at" text,
	"approved_by" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_id" integer NOT NULL,
	"number" text NOT NULL,
	"type" text NOT NULL,
	"capacity" integer NOT NULL,
	"status" text NOT NULL,
	"notes" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "rooms_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"total_price_cents" integer NOT NULL,
	"total_cost_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"cash_session_id" integer,
	"payment_method" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"received_by_user_id" integer NOT NULL,
	"received_by_name" text NOT NULL,
	"received_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"sale_item_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"total_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"return_number" text,
	"reason" text NOT NULL,
	"responsible" text NOT NULL,
	"physical_condition" text NOT NULL,
	"returns_to_stock" boolean DEFAULT false NOT NULL,
	"refund_method" text NOT NULL,
	"refund_amount_cents" integer DEFAULT 0 NOT NULL,
	"cash_session_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sale_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "sale_stock_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_number" text NOT NULL,
	"sale_year" integer NOT NULL,
	"sequence" integer NOT NULL,
	"sale_type" text NOT NULL,
	"stay_id" integer,
	"room_id" integer,
	"consumer_guest_id" integer,
	"customer_name" text,
	"customer_ci" text,
	"customer_phone" text,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"cash_session_id" integer,
	"subtotal_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"print_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" text NOT NULL,
	"cancelled_by_user_id" integer,
	"cancelled_by_name" text,
	"cancelled_at" text,
	"cancellation_reason" text,
	"courtesy_reviewed_by_user_id" integer,
	"courtesy_reviewed_by_name" text,
	"courtesy_reviewed_at" text,
	"courtesy_review_note" text,
	CONSTRAINT "sales_sale_number_unique" UNIQUE("sale_number")
);
--> statement-breakpoint
CREATE TABLE "stay_guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"guest_id" integer NOT NULL,
	"is_primary" boolean NOT NULL,
	"joined_at" text,
	"left_at" text,
	"added_by" text,
	"removed_by" text,
	"removal_reason" text
);
--> statement-breakpoint
CREATE TABLE "stay_room_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"started_at" text NOT NULL,
	"ended_at" text,
	"start_reason" text NOT NULL,
	"end_reason" text,
	"created_by" text NOT NULL,
	"ended_by" text
);
--> statement-breakpoint
CREATE TABLE "stays" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"primary_guest_id" integer NOT NULL,
	"stay_type" text NOT NULL,
	"check_in" text NOT NULL,
	"expected_check_out" text,
	"check_out" text,
	"status" text NOT NULL,
	"notes" text NOT NULL,
	"capacity_override" boolean DEFAULT false NOT NULL,
	"capacity_override_reason" text,
	"capacity_authorized_by" text
);
--> statement-breakpoint
CREATE TABLE "stock_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"expires_on" text,
	"received_at" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "stock_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"from_location_id" integer,
	"to_location_id" integer,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"total_cost_cents" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"responsible" text NOT NULL,
	"supplier" text,
	"receipt_number" text,
	"receipt_filename" text,
	"receipt_object_key" text,
	"receipt_content_type" text,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_access_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"performed_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"invited_by" text,
	"activated_at" text,
	"last_access_at" text,
	"deactivated_at" text,
	"deactivated_by" text,
	"deactivation_reason" text,
	"created_at" text NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "work_order_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"detail" text DEFAULT '' NOT NULL,
	"performed_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"stay_id" integer,
	"segment_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"assigned_user_id" integer,
	"due_at" text,
	"blocks_room" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"started_at" text,
	"started_by" text,
	"completed_at" text,
	"completed_by" text,
	"cancelled_at" text,
	"cancelled_by" text,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_room_created" ON "audit_logs" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_cash_sessions_status_opened" ON "cash_sessions" USING btree ("status","opened_at");--> statement-breakpoint
CREATE INDEX "idx_change_requests_status_requested" ON "change_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_change_requests_entity_field" ON "change_requests" USING btree ("entity_type","entity_id","field_name");--> statement-breakpoint
CREATE INDEX "idx_commercial_products_active_name" ON "commercial_products" USING btree ("active","name");--> statement-breakpoint
CREATE INDEX "idx_contracts_stay_status" ON "contracts" USING btree ("stay_id","status");--> statement-breakpoint
CREATE INDEX "idx_contracts_end_status" ON "contracts" USING btree ("end_date","status");--> statement-breakpoint
CREATE INDEX "idx_documents_stay_id" ON "documents" USING btree ("stay_id");--> statement-breakpoint
CREATE INDEX "idx_documents_segment_id" ON "documents" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "idx_documents_work_order_id" ON "documents" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "idx_documents_inventory_movement_id" ON "documents" USING btree ("inventory_movement_id");--> statement-breakpoint
CREATE INDEX "idx_documents_contract_id" ON "documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_exceptional_exit_status_requested" ON "exceptional_exit_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_exceptional_exit_segment_requested" ON "exceptional_exit_requests" USING btree ("segment_id","requested_at");--> statement-breakpoint
CREATE INDEX "idx_exit_assessments_status_submitted" ON "exit_assessments" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_exit_assessments_segment_submitted" ON "exit_assessments" USING btree ("segment_id","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_guests_ci" ON "guests" USING btree ("ci");--> statement-breakpoint
CREATE INDEX "idx_inspection_items_inspection" ON "inspection_items" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_inspections_stay_kind" ON "inspections" USING btree ("stay_id","kind");--> statement-breakpoint
CREATE INDEX "idx_inspections_segment_kind" ON "inspections" USING btree ("segment_id","kind");--> statement-breakpoint
CREATE INDEX "idx_inventory_room_id" ON "inventory_items" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_segment_created" ON "inventory_movements" USING btree ("segment_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_room_created" ON "inventory_movements" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_patrimony_expenses_property_date" ON "patrimony_expenses" USING btree ("property_id","incurred_on");--> statement-breakpoint
CREATE INDEX "idx_patrimony_expenses_status_date" ON "patrimony_expenses" USING btree ("status","incurred_on");--> statement-breakpoint
CREATE INDEX "idx_patrimony_payments_property_date" ON "patrimony_payments" USING btree ("property_id","paid_on");--> statement-breakpoint
CREATE INDEX "idx_patrimony_payments_tenant_date" ON "patrimony_payments" USING btree ("tenant_id","paid_on");--> statement-breakpoint
CREATE INDEX "idx_patrimony_properties_status" ON "patrimony_properties" USING btree ("active","status");--> statement-breakpoint
CREATE INDEX "idx_patrimony_tenants_property_active" ON "patrimony_tenants" USING btree ("property_id","active");--> statement-breakpoint
CREATE INDEX "idx_payment_evidences_payment" ON "payment_evidences" USING btree ("sale_payment_id");--> statement-breakpoint
CREATE INDEX "idx_primary_transfers_status_requested" ON "primary_guest_transfers" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_primary_transfers_stay_requested" ON "primary_guest_transfers" USING btree ("stay_id","requested_at");--> statement-breakpoint
CREATE INDEX "idx_replenishment_status_requested" ON "replenishment_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_replenishment_product_status" ON "replenishment_requests" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "idx_events_room_created" ON "room_events" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_room_infrastructure_room_active" ON "room_infrastructure_items" USING btree ("room_id","active");--> statement-breakpoint
CREATE INDEX "idx_turnovers_room_status" ON "room_turnovers" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "idx_rooms_floor_id" ON "rooms" USING btree ("floor_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_sale" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sale_payments_sale_received" ON "sale_payments" USING btree ("sale_id","received_at");--> statement-breakpoint
CREATE INDEX "idx_sale_payments_session_method" ON "sale_payments" USING btree ("cash_session_id","payment_method");--> statement-breakpoint
CREATE INDEX "idx_sale_return_items_return" ON "sale_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_sale_return_items_sale_item" ON "sale_return_items" USING btree ("sale_item_id");--> statement-breakpoint
CREATE INDEX "idx_sale_returns_sale_created" ON "sale_returns" USING btree ("sale_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sale_returns_session_method" ON "sale_returns" USING btree ("cash_session_id","refund_method");--> statement-breakpoint
CREATE INDEX "idx_sale_allocations_sale" ON "sale_stock_allocations" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sale_allocations_batch" ON "sale_stock_allocations" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_sales_stay_status" ON "sales" USING btree ("stay_id","status");--> statement-breakpoint
CREATE INDEX "idx_sales_created_status" ON "sales" USING btree ("created_at","status");--> statement-breakpoint
CREATE INDEX "idx_stay_guests_stay_active" ON "stay_guests" USING btree ("stay_id","left_at");--> statement-breakpoint
CREATE INDEX "idx_stay_segments_stay_sequence" ON "stay_room_segments" USING btree ("stay_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_stays_room_status" ON "stays" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_product_location_expiry" ON "stock_batches" USING btree ("product_id","location_id","expires_on");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_product_created" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_locations_created" ON "stock_movements" USING btree ("from_location_id","to_location_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_access_events_user" ON "user_access_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_work_order_history_order_created" ON "work_order_history" USING btree ("work_order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_work_orders_room_status" ON "work_orders" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "idx_work_orders_status_priority" ON "work_orders" USING btree ("status","priority");