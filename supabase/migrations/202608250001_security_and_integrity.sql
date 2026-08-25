begin;

-- Relaciones del núcleo hotelero y trazabilidad de usuarios.
alter table public.user_access_events add constraint user_access_events_user_fkey foreign key (user_id) references public.users(id);
alter table public.rooms add constraint rooms_floor_fkey foreign key (floor_id) references public.floors(id);
alter table public.stays add constraint stays_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.stays add constraint stays_primary_guest_fkey foreign key (primary_guest_id) references public.guests(id);
alter table public.stay_room_segments add constraint stay_segments_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.stay_room_segments add constraint stay_segments_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.stay_guests add constraint stay_guests_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.stay_guests add constraint stay_guests_guest_fkey foreign key (guest_id) references public.guests(id);
alter table public.primary_guest_transfers add constraint primary_transfers_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.primary_guest_transfers add constraint primary_transfers_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.primary_guest_transfers add constraint primary_transfers_previous_guest_fkey foreign key (previous_guest_id) references public.guests(id);
alter table public.primary_guest_transfers add constraint primary_transfers_proposed_guest_fkey foreign key (proposed_guest_id) references public.guests(id);
alter table public.primary_guest_transfers add constraint primary_transfers_requested_user_fkey foreign key (requested_by_user_id) references public.users(id);
alter table public.primary_guest_transfers add constraint primary_transfers_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.room_events add constraint room_events_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.room_events add constraint room_events_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.contracts add constraint contracts_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.contracts add constraint contracts_primary_guest_fkey foreign key (primary_guest_id) references public.guests(id);
alter table public.contracts add constraint contracts_initial_room_fkey foreign key (initial_room_id) references public.rooms(id);
alter table public.contracts add constraint contracts_parent_fkey foreign key (parent_contract_id) references public.contracts(id);
alter table public.inventory_items add constraint inventory_items_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.room_infrastructure_items add constraint infrastructure_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.inventory_movements add constraint inventory_movements_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.inventory_movements add constraint inventory_movements_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.inventory_movements add constraint inventory_movements_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.inventory_movements add constraint inventory_movements_item_fkey foreign key (inventory_item_id) references public.inventory_items(id);
alter table public.inspections add constraint inspections_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.inspections add constraint inspections_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.inspections add constraint inspections_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.inspection_items add constraint inspection_items_inspection_fkey foreign key (inspection_id) references public.inspections(id);
alter table public.inspection_items add constraint inspection_items_inventory_fkey foreign key (inventory_item_id) references public.inventory_items(id);
alter table public.room_turnovers add constraint room_turnovers_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.room_turnovers add constraint room_turnovers_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.room_turnovers add constraint room_turnovers_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.room_turnovers add constraint room_turnovers_inspection_fkey foreign key (final_inspection_id) references public.inspections(id);
alter table public.work_orders add constraint work_orders_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.work_orders add constraint work_orders_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.work_orders add constraint work_orders_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.work_orders add constraint work_orders_assigned_user_fkey foreign key (assigned_user_id) references public.users(id);
alter table public.work_order_history add constraint work_order_history_order_fkey foreign key (work_order_id) references public.work_orders(id);
alter table public.change_requests add constraint change_requests_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.change_requests add constraint change_requests_requested_user_fkey foreign key (requested_by_user_id) references public.users(id);
alter table public.change_requests add constraint change_requests_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.exit_assessments add constraint exit_assessments_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.exit_assessments add constraint exit_assessments_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.exit_assessments add constraint exit_assessments_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.exit_assessments add constraint exit_assessments_delivery_fkey foreign key (delivery_inspection_id) references public.inspections(id);
alter table public.exit_assessments add constraint exit_assessments_return_fkey foreign key (return_inspection_id) references public.inspections(id);
alter table public.exit_assessments add constraint exit_assessments_order_fkey foreign key (work_order_id) references public.work_orders(id);
alter table public.exit_assessments add constraint exit_assessments_submitted_user_fkey foreign key (submitted_by_user_id) references public.users(id);
alter table public.exit_assessments add constraint exit_assessments_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.exceptional_exit_requests add constraint exceptional_exit_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.exceptional_exit_requests add constraint exceptional_exit_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.exceptional_exit_requests add constraint exceptional_exit_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.exceptional_exit_requests add constraint exceptional_exit_requested_user_fkey foreign key (requested_by_user_id) references public.users(id);
alter table public.exceptional_exit_requests add constraint exceptional_exit_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.documents add constraint documents_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.documents add constraint documents_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.documents add constraint documents_segment_fkey foreign key (segment_id) references public.stay_room_segments(id);
alter table public.documents add constraint documents_work_order_fkey foreign key (work_order_id) references public.work_orders(id);
alter table public.documents add constraint documents_inventory_movement_fkey foreign key (inventory_movement_id) references public.inventory_movements(id);
alter table public.documents add constraint documents_contract_fkey foreign key (contract_id) references public.contracts(id);
alter table public.audit_logs add constraint audit_logs_user_fkey foreign key (user_id) references public.users(id);
alter table public.audit_logs add constraint audit_logs_room_fkey foreign key (room_id) references public.rooms(id);

-- Relaciones de POS y almacén.
alter table public.stock_batches add constraint stock_batches_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.stock_batches add constraint stock_batches_location_fkey foreign key (location_id) references public.stock_locations(id);
alter table public.stock_movements add constraint stock_movements_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.stock_movements add constraint stock_movements_from_location_fkey foreign key (from_location_id) references public.stock_locations(id);
alter table public.stock_movements add constraint stock_movements_to_location_fkey foreign key (to_location_id) references public.stock_locations(id);
alter table public.commercial_settings add constraint commercial_settings_user_fkey foreign key (updated_by_user_id) references public.users(id);
alter table public.replenishment_requests add constraint replenishment_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.replenishment_requests add constraint replenishment_requested_user_fkey foreign key (requested_by_user_id) references public.users(id);
alter table public.replenishment_requests add constraint replenishment_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.replenishment_requests add constraint replenishment_movement_fkey foreign key (fulfilled_movement_id) references public.stock_movements(id);
alter table public.sales add constraint sales_stay_fkey foreign key (stay_id) references public.stays(id);
alter table public.sales add constraint sales_room_fkey foreign key (room_id) references public.rooms(id);
alter table public.sales add constraint sales_consumer_guest_fkey foreign key (consumer_guest_id) references public.guests(id);
alter table public.sales add constraint sales_cash_session_fkey foreign key (cash_session_id) references public.cash_sessions(id);
alter table public.sales add constraint sales_created_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.sales add constraint sales_cancelled_user_fkey foreign key (cancelled_by_user_id) references public.users(id);
alter table public.sales add constraint sales_courtesy_user_fkey foreign key (courtesy_reviewed_by_user_id) references public.users(id);
alter table public.cash_sessions add constraint cash_sessions_opened_user_fkey foreign key (opened_by_user_id) references public.users(id);
alter table public.cash_sessions add constraint cash_sessions_closed_user_fkey foreign key (closed_by_user_id) references public.users(id);
alter table public.cash_sessions add constraint cash_sessions_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.sale_payments add constraint sale_payments_sale_fkey foreign key (sale_id) references public.sales(id);
alter table public.sale_payments add constraint sale_payments_session_fkey foreign key (cash_session_id) references public.cash_sessions(id);
alter table public.sale_payments add constraint sale_payments_user_fkey foreign key (received_by_user_id) references public.users(id);
alter table public.payment_evidences add constraint payment_evidences_payment_fkey foreign key (sale_payment_id) references public.sale_payments(id);
alter table public.payment_evidences add constraint payment_evidences_user_fkey foreign key (uploaded_by_user_id) references public.users(id);
alter table public.sale_returns add constraint sale_returns_sale_fkey foreign key (sale_id) references public.sales(id);
alter table public.sale_returns add constraint sale_returns_session_fkey foreign key (cash_session_id) references public.cash_sessions(id);
alter table public.sale_returns add constraint sale_returns_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.sale_return_items add constraint sale_return_items_return_fkey foreign key (return_id) references public.sale_returns(id);
alter table public.sale_return_items add constraint sale_return_items_sale_item_fkey foreign key (sale_item_id) references public.sale_items(id);
alter table public.sale_return_items add constraint sale_return_items_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.sale_items add constraint sale_items_sale_fkey foreign key (sale_id) references public.sales(id);
alter table public.sale_items add constraint sale_items_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.sale_stock_allocations add constraint sale_allocations_sale_fkey foreign key (sale_id) references public.sales(id);
alter table public.sale_stock_allocations add constraint sale_allocations_product_fkey foreign key (product_id) references public.commercial_products(id);
alter table public.sale_stock_allocations add constraint sale_allocations_batch_fkey foreign key (batch_id) references public.stock_batches(id);

-- Relaciones patrimoniales.
alter table public.patrimony_properties add constraint patrimony_properties_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.patrimony_tenants add constraint patrimony_tenants_property_fkey foreign key (property_id) references public.patrimony_properties(id);
alter table public.patrimony_tenants add constraint patrimony_tenants_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.patrimony_payments add constraint patrimony_payments_property_fkey foreign key (property_id) references public.patrimony_properties(id);
alter table public.patrimony_payments add constraint patrimony_payments_tenant_fkey foreign key (tenant_id) references public.patrimony_tenants(id);
alter table public.patrimony_payments add constraint patrimony_payments_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.patrimony_expenses add constraint patrimony_expenses_property_fkey foreign key (property_id) references public.patrimony_properties(id);
alter table public.patrimony_expenses add constraint patrimony_expenses_created_user_fkey foreign key (created_by_user_id) references public.users(id);
alter table public.patrimony_expenses add constraint patrimony_expenses_reviewed_user_fkey foreign key (reviewed_by_user_id) references public.users(id);
alter table public.patrimony_distribution add constraint patrimony_distribution_user_fkey foreign key (updated_by_user_id) references public.users(id);

-- Reglas de unicidad operativa.
create unique index users_email_normalized_uq on public.users (lower(email));
create unique index rooms_number_normalized_uq on public.rooms (lower(number));
create unique index guests_ci_normalized_uq on public.guests (lower(trim(ci))) where ci is not null and trim(ci) <> '';
create unique index stays_one_active_room_uq on public.stays (room_id) where status = 'ACTIVA';
create unique index stay_segments_one_open_uq on public.stay_room_segments (stay_id) where ended_at is null;
create unique index stay_guests_one_primary_uq on public.stay_guests (stay_id) where left_at is null and is_primary;
create unique index contracts_number_uq on public.contracts (contract_number);
create unique index cash_sessions_one_open_uq on public.cash_sessions ((1)) where status = 'ABIERTA';
create unique index sales_year_sequence_uq on public.sales (sale_year, sequence);
create unique index patrimony_active_unit_uq on public.patrimony_tenants (property_id, lower(unit_name)) where active;
create unique index patrimony_distribution_position_uq on public.patrimony_distribution (position);

-- Validaciones de dominio que antes dependían exclusivamente de la aplicación.
alter table public.users add constraint users_role_check check (role in ('PROPIETARIO', 'ADMINISTRADOR', 'RECEPCION'));
alter table public.rooms add constraint rooms_status_check check (status in ('DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO', 'FUERA_SERVICIO'));
alter table public.rooms add constraint rooms_capacity_check check (capacity > 0);
alter table public.stays add constraint stays_type_check check (stay_type in ('DIA', 'SEMANA', 'MES', 'ARRENDAMIENTO'));
alter table public.stays add constraint stays_status_check check (status in ('ACTIVA', 'FINALIZADA'));
alter table public.inventory_items add constraint inventory_items_quantity_check check (quantity > 0);
alter table public.inspection_items add constraint inspection_items_quantity_check check (quantity > 0);
alter table public.inventory_movements add constraint inventory_movements_quantity_check check (quantity > 0);
alter table public.commercial_products add constraint commercial_product_values_check check (units_per_purchase > 0 and sale_price_cents >= 0 and average_cost_cents >= 0 and minimum_stock >= 0);
alter table public.stock_batches add constraint stock_batches_values_check check (quantity >= 0 and unit_cost_cents >= 0);
alter table public.stock_movements add constraint stock_movements_values_check check (quantity > 0 and total_cost_cents >= 0);
alter table public.sales add constraint sales_amounts_check check (subtotal_cents >= 0 and total_cents >= 0);
alter table public.sale_items add constraint sale_items_values_check check (quantity > 0 and unit_price_cents >= 0 and unit_cost_cents >= 0 and total_price_cents >= 0 and total_cost_cents >= 0);
alter table public.sale_payments add constraint sale_payments_amount_check check (amount_cents > 0);
alter table public.sale_returns add constraint sale_returns_amount_check check (refund_amount_cents >= 0);
alter table public.sale_return_items add constraint sale_return_items_values_check check (quantity > 0 and unit_price_cents >= 0 and unit_cost_cents >= 0 and total_price_cents >= 0);
alter table public.sale_stock_allocations add constraint sale_allocations_values_check check (quantity > 0 and unit_cost_cents >= 0);
alter table public.patrimony_properties add constraint patrimony_properties_values_check check (unit_count >= 0 and monthly_potential_cents >= 0);
alter table public.patrimony_tenants add constraint patrimony_tenants_values_check check (monthly_rent_cents >= 0 and payment_day between 1 and 31);
alter table public.patrimony_payments add constraint patrimony_payments_amount_check check (amount_cents > 0);
alter table public.patrimony_expenses add constraint patrimony_expenses_amount_check check (amount_cents > 0);
alter table public.patrimony_distribution add constraint patrimony_distribution_percentage_check check (percentage between 0 and 100);
alter table public.patrimony_distribution add constraint patrimony_distribution_position_check check (position >= 0);

-- La distribución puede cambiar en bloque, pero al confirmar la transacción debe sumar 100%.
create or replace function public.validate_patrimony_distribution_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.patrimony_distribution)
     and (select coalesce(sum(percentage), 0) from public.patrimony_distribution) <> 100 then
    raise exception 'La distribución patrimonial debe sumar exactamente 100%%';
  end if;
  return null;
end;
$$;


-- Datos mínimos operativos; no se crean huéspedes, propiedades ni ventas de demostración.
insert into public.stock_locations (code, name, active, created_at)
values
  ('MAIN', 'Almacén principal', true, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('RECEPTION', 'Stock de recepción', true, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
on conflict (code) do nothing;

insert into public.patrimony_distribution (code, label, percentage, position, updated_at)
values
  ('FAMILIAR_1', 'Familiar 1', 15, 1, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('FAMILIAR_2', 'Familiar 2', 15, 2, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('FAMILIAR_3', 'Familiar 3', 20, 3, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('FAMILIAR_4', 'Familiar 4', 15, 4, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('FAMILIAR_5', 'Familiar 5', 35, 5, to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
on conflict (code) do nothing;

-- Supabase se usa únicamente desde las rutas del servidor. Anon y authenticated quedan sin acceso directo.
do $$
declare
  app_table text;
begin
  foreach app_table in array array[
    'audit_logs', 'cash_sessions', 'change_requests', 'commercial_products',
    'commercial_sequences', 'commercial_settings', 'contracts', 'documents',
    'exceptional_exit_requests', 'exit_assessments', 'floors', 'guests',
    'inspection_items', 'inspections', 'inventory_items', 'inventory_movements',
    'patrimony_distribution', 'patrimony_expenses', 'patrimony_payments',
    'patrimony_properties', 'patrimony_tenants', 'payment_evidences',
    'primary_guest_transfers', 'replenishment_requests', 'room_events',
    'room_infrastructure_items', 'room_turnovers', 'rooms', 'sale_items',
    'sale_payments', 'sale_return_items', 'sale_returns', 'sale_stock_allocations',
    'sales', 'stay_guests', 'stay_room_segments', 'stays', 'stock_batches',
    'stock_locations', 'stock_movements', 'user_access_events', 'users',
    'work_order_history', 'work_orders'
  ] loop
    execute format('alter table public.%I enable row level security', app_table);
    execute format('revoke all on table public.%I from anon, authenticated', app_table);
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Bucket privado para fotografías, contratos, actas y respaldos de pago.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotel-asael-evidencias',
  'hotel-asael-evidencias',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create constraint trigger patrimony_distribution_total_check
after insert or update or delete on public.patrimony_distribution
deferrable initially deferred
for each row execute function public.validate_patrimony_distribution_total();
commit;