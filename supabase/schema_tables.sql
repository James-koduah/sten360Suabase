create table public.users (
  id uuid not null default gen_random_uuid (),
  auth_id uuid null,
  email text not null,
  name text null,
  created_at timestamp without time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_auth_id_key unique (auth_id),
  constraint users_email_key unique (email),
  constraint users_auth_id_fkey foreign KEY (auth_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  country text null,
  city text null,
  address text null,
  employee_count integer null default 1,
  currency text null default 'GHS'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  owner_id uuid not null,
  subscription_tier text null default 'free'::text,
  subscription_status text null default 'active'::text,
  constraint organizations_pkey primary key (id),
  constraint organizations_owner_id_fkey foreign KEY (owner_id) references auth.users (id),
  constraint employee_count_positive check ((employee_count > 0))
) TABLESPACE pg_default;

create table public.clients (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  phone text null,
  address text null,
  date_of_birth date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  email text null,
  constraint clients_pkey primary key (id),
  constraint clients_organization_name_unique unique (organization_id, name),
  constraint clients_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.orders (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  order_number text not null,
  client_id uuid not null,
  description text null,
  due_date timestamp with time zone null,
  status text not null,
  total_amount numeric(10, 2) not null default 0,
  outstanding_balance numeric(10, 2) not null default 0,
  payment_status text not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint orders_pkey primary key (id),
  constraint orders_organization_id_order_number_key unique (organization_id, order_number),
  constraint orders_client_id_fkey foreign KEY (client_id) references clients (id) on delete RESTRICT,
  constraint orders_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.projects (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  description text null,
  base_price numeric(10, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status text null default 'active'::text,
  constraint projects_pkey primary key (id),
  constraint projects_organization_name_unique unique (organization_id, name),
  constraint projects_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.services (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  cost bigint null,
  constraint services_pkey primary key (id),
  constraint services_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.workers (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  whatsapp text null,
  image text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  email text null,
  phone text null,
  status text null default 'active'::text,
  constraint workers_pkey primary key (id),
  constraint workers_organization_name_unique unique (organization_id, name),
  constraint workers_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.products (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  description text null,
  category text not null,
  unit_price numeric(10, 2) not null default 0,
  stock_quantity integer not null default 0,
  reorder_point integer not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id),
  constraint products_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.tasks (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  worker_id uuid not null,
  project_id uuid not null,
  description text null,
  date date not null default CURRENT_DATE,
  status text not null default 'pending'::text,
  amount numeric(10, 2) not null default 0,
  completed_at timestamp with time zone null,
  late_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status_changed_at timestamp with time zone null default now(),
  delay_reason text null,
  order_id uuid null,
  constraint tasks_pkey primary key (id),
  constraint tasks_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint tasks_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint tasks_worker_id_fkey foreign KEY (worker_id) references workers (id) on delete CASCADE,
  constraint task_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'in_progress'::text,
          'delayed'::text,
          'completed'::text
        ]
      )
    )
  ),
  constraint tasks_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'in_progress'::text,
          'delayed'::text,
          'completed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create table public.sales_orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  client_id uuid not null,
  order_number text not null,
  total_amount numeric(10, 2) not null default 0,
  outstanding_balance numeric(10, 2) not null default 0,
  payment_status text not null default 'unpaid'::text,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint sales_orders_pkey primary key (id),
  constraint unique_order_number unique (organization_id, order_number),
  constraint sales_orders_client_id_fkey foreign KEY (client_id) references clients (id) on delete CASCADE,
  constraint sales_orders_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint positive_balance check ((outstanding_balance >= (0)::numeric)),
  constraint positive_total check ((total_amount >= (0)::numeric))
) TABLESPACE pg_default;

create table public.sales_order_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  sales_order_id uuid not null,
  product_id uuid null,
  name text not null,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,
  is_custom_item boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint sales_order_items_pkey primary key (id),
  constraint sales_order_items_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint sales_order_items_sales_order_id_fkey foreign KEY (sales_order_id) references sales_orders (id) on delete CASCADE,
  constraint positive_quantity check ((quantity > 0)),
  constraint positive_total_price check ((total_price >= (0)::numeric)),
  constraint positive_unit_price check ((unit_price >= (0)::numeric))
) TABLESPACE pg_default;

-- Create payments table
CREATE TABLE payments (
    id serial not null,
    reference_id uuid not null,
    reference_type character varying(50) not null,
    organization_id uuid null,
    transaction_reference character varying(255) null,
    amount numeric(18, 2) not null,
    currency character varying(20) null,
    payment_method character varying(50) not null,
    recorded_by uuid null,
    created_at timestamp without time zone null default CURRENT_TIMESTAMP,
    constraint new_payments_pkey primary key (id)
);

-- Add indexes
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_reference_id ON payments(reference_id);
CREATE INDEX idx_payments_reference_type ON payments(reference_type);
CREATE INDEX idx_payments_recorded_by ON payments(recorded_by);



create table public.client_custom_fields (
  id uuid not null default gen_random_uuid (),
  client_id uuid not null,
  title text not null,
  value text not null,
  type text not null,
  created_at timestamp with time zone null default now(),
  constraint client_custom_fields_pkey primary key (id),
  constraint client_custom_fields_client_id_fkey foreign KEY (client_id) references clients (id) on delete CASCADE,
  constraint client_custom_fields_type_check check ((type = any (array['text'::text, 'file'::text])))
) TABLESPACE pg_default;

create table public.order_custom_fields (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  field_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint order_custom_fields_pkey primary key (id),
  constraint order_custom_fields_order_id_field_id_key unique (order_id, field_id),
  constraint order_custom_fields_field_id_fkey foreign KEY (field_id) references client_custom_fields (id) on delete CASCADE,
  constraint order_custom_fields_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.order_services (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  service_id uuid not null,
  quantity integer not null default 1,
  cost numeric(10, 2) not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint order_services_pkey primary key (id),
  constraint order_services_order_id_service_id_key unique (order_id, service_id),
  constraint order_services_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_services_service_id_fkey foreign KEY (service_id) references services (id) on delete RESTRICT
) TABLESPACE pg_default;

create table public.order_workers (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  worker_id uuid not null,
  project_id uuid not null,
  status text not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint order_workers_pkey primary key (id),
  constraint order_workers_order_id_worker_id_project_id_key unique (order_id, worker_id, project_id),
  constraint order_workers_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_workers_project_id_fkey foreign KEY (project_id) references projects (id) on delete RESTRICT,
  constraint order_workers_worker_id_fkey foreign KEY (worker_id) references workers (id) on delete RESTRICT
) TABLESPACE pg_default;

create table public.users_organizations (
  user_id uuid not null,
  organization_id uuid not null,
  role text not null default 'member'::text,
  created_at timestamp with time zone not null default now(),
  constraint users_organizations_pkey primary key (user_id, organization_id),
  constraint users_organizations_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint users_organizations_user_id_fkey foreign KEY (user_id) references users (auth_id) on delete CASCADE
) TABLESPACE pg_default;

create table public.worker_project_rates (
  id uuid not null default gen_random_uuid (),
  worker_id uuid not null,
  project_id uuid not null,
  rate numeric(10, 2) not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint worker_project_rates_pkey primary key (id),
  constraint worker_project_rates_unique unique (worker_id, project_id),
  constraint worker_project_rates_worker_id_project_id_key unique (worker_id, project_id),
  constraint worker_project_rates_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint worker_project_rates_worker_id_fkey foreign KEY (worker_id) references workers (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.deductions (
  id uuid not null default gen_random_uuid (),
  task_id uuid not null,
  amount numeric(10, 2) not null default 0,
  reason text not null,
  created_at timestamp with time zone null default now(),
  constraint deductions_pkey primary key (id),
  constraint deductions_task_id_fkey foreign KEY (task_id) references tasks (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.inventory_transactions (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  organization_id uuid not null,
  type text not null,
  quantity integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  notes text null,
  created_at timestamp with time zone null default now(),
  created_by uuid not null,
  constraint inventory_transactions_pkey primary key (id),
  constraint inventory_transactions_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint inventory_transactions_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint inventory_transactions_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint inventory_transactions_type_check check (
    (
      type = any (
        array[
          'purchase'::text,
          'sale'::text,
          'adjustment'::text,
          'return'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

create index IF not exists idx_organizations_owner on public.organizations using btree (owner_id) TABLESPACE pg_default;

create index IF not exists idx_organizations_country on public.organizations using btree (country) TABLESPACE pg_default;

create index IF not exists idx_organizations_city on public.organizations using btree (city) TABLESPACE pg_default;

create index IF not exists projects_organization_id_idx on public.projects using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_projects_organization on public.projects using btree (organization_id) TABLESPACE pg_default;

create index IF not exists workers_organization_id_idx on public.workers using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_workers_organization on public.workers using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_products_organization on public.products using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_products_category on public.products using btree (category) TABLESPACE pg_default;

create index IF not exists idx_products_stock on public.products using btree (stock_quantity) TABLESPACE pg_default;

create index IF not exists idx_tasks_date on public.tasks using btree (date) TABLESPACE pg_default;

create index IF not exists idx_tasks_order_id on public.tasks using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_organization on public.tasks using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_project on public.tasks using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_status on public.tasks using btree (status) TABLESPACE pg_default;

create index IF not exists idx_tasks_status_changed_at on public.tasks using btree (status_changed_at) TABLESPACE pg_default;

create index IF not exists idx_tasks_worker on public.tasks using btree (worker_id) TABLESPACE pg_default;

create index IF not exists idx_payments_order on public.payments using btree (sales_order_id) TABLESPACE pg_default;

create index IF not exists orders_organization_id_idx on public.orders using btree (organization_id) TABLESPACE pg_default;

create index IF not exists orders_client_id_idx on public.orders using btree (client_id) TABLESPACE pg_default;

create index IF not exists orders_created_at_idx on public.orders using btree (created_at) TABLESPACE pg_default;

create index IF not exists orders_status_idx on public.orders using btree (status) TABLESPACE pg_default;

create index IF not exists clients_organization_id_idx on public.clients using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_client_custom_fields_client on public.client_custom_fields using btree (client_id) TABLESPACE pg_default;

create index IF not exists idx_client_custom_fields_type on public.client_custom_fields using btree (type) TABLESPACE pg_default;

create index IF not exists idx_order_custom_fields_field on public.order_custom_fields using btree (field_id) TABLESPACE pg_default;

create index IF not exists idx_order_custom_fields_order on public.order_custom_fields using btree (order_id) TABLESPACE pg_default;

create index IF not exists order_services_order_id_idx on public.order_services using btree (order_id) TABLESPACE pg_default;

create index IF not exists order_services_service_id_idx on public.order_services using btree (service_id) TABLESPACE pg_default;

create index IF not exists order_workers_order_id_idx on public.order_workers using btree (order_id) TABLESPACE pg_default;

create index IF not exists order_workers_worker_id_idx on public.order_workers using btree (worker_id) TABLESPACE pg_default;

create index IF not exists order_workers_project_id_idx on public.order_workers using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_sales_orders_client on public.sales_orders using btree (client_id) TABLESPACE pg_default;

create index IF not exists idx_sales_orders_organization on public.sales_orders using btree (organization_id) TABLESPACE pg_default;

create index IF not exists sales_orders_order_number_idx on public.sales_orders using btree (order_number) TABLESPACE pg_default;

create index IF not exists idx_sales_order_items_order on public.sales_order_items using btree (sales_order_id) TABLESPACE pg_default;

create index IF not exists idx_service_payments_order on public.service_payments using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_service_payments_organization on public.service_payments using btree (organization_id) TABLESPACE pg_default;

create index IF not exists worker_project_rates_worker_id_idx on public.worker_project_rates using btree (worker_id) TABLESPACE pg_default;

create index IF not exists worker_project_rates_project_id_idx on public.worker_project_rates using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_worker_project_rates_worker on public.worker_project_rates using btree (worker_id) TABLESPACE pg_default;

create index IF not exists idx_worker_project_rates_project on public.worker_project_rates using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_deductions_task on public.deductions using btree (task_id) TABLESPACE pg_default;

create index IF not exists idx_inventory_transactions_product on public.inventory_transactions using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_inventory_transactions_organization on public.inventory_transactions using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_inventory_transactions_type on public.inventory_transactions using btree (type) TABLESPACE pg_default;

create index IF not exists idx_inventory_transactions_created_at on public.inventory_transactions using btree (created_at) TABLESPACE pg_default;
