-- Create enum types for payment methods
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('mobile_money', 'bank_transfer', 'cash', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create clients table if not exists
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add columns to clients if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email') THEN
        ALTER TABLE clients ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'phone') THEN
        ALTER TABLE clients ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
        ALTER TABLE clients ADD COLUMN address TEXT;
    END IF;
END $$;

-- Create client_custom_fields table if not exists
CREATE TABLE IF NOT EXISTS client_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value TEXT,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workers table if not exists
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add columns to workers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'email') THEN
        ALTER TABLE workers ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'phone') THEN
        ALTER TABLE workers ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'status') THEN
        ALTER TABLE workers ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Create projects table if not exists
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add columns to projects if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'description') THEN
        ALTER TABLE projects ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'status') THEN
        ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Create worker_project_rates table if not exists
CREATE TABLE IF NOT EXISTS worker_project_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rate DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create order_custom_fields table if not exists
CREATE TABLE IF NOT EXISTS order_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES client_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create unique constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_organization_name_unique') THEN
        ALTER TABLE clients ADD CONSTRAINT clients_organization_name_unique UNIQUE (organization_id, name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workers_organization_name_unique') THEN
        ALTER TABLE workers ADD CONSTRAINT workers_organization_name_unique UNIQUE (organization_id, name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_organization_name_unique') THEN
        ALTER TABLE projects ADD CONSTRAINT projects_organization_name_unique UNIQUE (organization_id, name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worker_project_rates_unique') THEN
        ALTER TABLE worker_project_rates ADD CONSTRAINT worker_project_rates_unique UNIQUE (worker_id, project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_custom_fields_unique') THEN
        ALTER TABLE order_custom_fields ADD CONSTRAINT order_custom_fields_unique UNIQUE (order_id, custom_field_id);
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'clients_organization_id_idx') THEN
        CREATE INDEX clients_organization_id_idx ON clients(organization_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'client_custom_fields_client_id_idx') THEN
        CREATE INDEX client_custom_fields_client_id_idx ON client_custom_fields(client_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'workers_organization_id_idx') THEN
        CREATE INDEX workers_organization_id_idx ON workers(organization_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'projects_organization_id_idx') THEN
        CREATE INDEX projects_organization_id_idx ON projects(organization_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'worker_project_rates_worker_id_idx') THEN
        CREATE INDEX worker_project_rates_worker_id_idx ON worker_project_rates(worker_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'worker_project_rates_project_id_idx') THEN
        CREATE INDEX worker_project_rates_project_id_idx ON worker_project_rates(project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'order_custom_fields_order_id_idx') THEN
        CREATE INDEX order_custom_fields_order_id_idx ON order_custom_fields(order_id);
    END IF;
END $$;

--------------------------
-- Create enum types for order status and payment status
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid');

-- Create the orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status order_status NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    outstanding_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(organization_id, order_number)
);

-- Create the order_workers table (junction table for orders and workers)
CREATE TABLE order_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(order_id, worker_id, project_id)
);

-- Create the order_services table (junction table for orders and services)
CREATE TABLE order_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(order_id, service_id)
);

-- Create indexes for better query performance
CREATE INDEX orders_organization_id_idx ON orders(organization_id);
CREATE INDEX orders_client_id_idx ON orders(client_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX order_workers_order_id_idx ON order_workers(order_id);
CREATE INDEX order_workers_worker_id_idx ON order_workers(worker_id);
CREATE INDEX order_workers_project_id_idx ON order_workers(project_id);
CREATE INDEX order_services_order_id_idx ON order_services(order_id);
CREATE INDEX order_services_service_id_idx ON order_services(service_id);

--------------------------------

-- Create the create_order function
CREATE OR REPLACE FUNCTION create_order(
    p_organization_id UUID,
    p_client_id UUID,
    p_description TEXT,
    p_due_date TIMESTAMP WITH TIME ZONE,
    p_total_amount DECIMAL(10,2),
    p_workers JSONB,
    p_services JSONB,
    p_custom_fields JSONB
) RETURNS orders AS $$
DECLARE
    v_order orders;
    v_worker JSONB;
    v_service JSONB;
    v_custom_field JSONB;
    v_order_number TEXT;
BEGIN
    -- Generate order number (format: ORD-YYYYMMDD-XXXX)
    SELECT 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
           LPAD(CAST(COALESCE(
               (SELECT MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER))
                FROM orders
                WHERE organization_id = p_organization_id
                AND order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'),
               0) + 1 AS TEXT), 4, '0')
    INTO v_order_number;

    -- Insert the order
    INSERT INTO orders (
        organization_id,
        order_number,
        client_id,
        description,
        due_date,
        status,
        total_amount,
        outstanding_balance,
        payment_status
    ) VALUES (
        p_organization_id,
        v_order_number,
        p_client_id,
        p_description,
        p_due_date,
        'draft',
        p_total_amount,
        p_total_amount,
        'unpaid'
    ) RETURNING * INTO v_order;

    -- Insert order workers
    FOR v_worker IN SELECT * FROM jsonb_array_elements(p_workers)
    LOOP
        INSERT INTO order_workers (
            order_id,
            worker_id,
            project_id,
            status
        ) VALUES (
            v_order.id,
            (v_worker->>'worker_id')::UUID,
            (v_worker->>'project_id')::UUID,
            'assigned'
        );
    END LOOP;

    -- Insert order services
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
        INSERT INTO order_services (
            order_id,
            service_id,
            quantity,
            cost
        ) VALUES (
            v_order.id,
            (v_service->>'service_id')::UUID,
            (v_service->>'quantity')::INTEGER,
            (v_service->>'cost')::DECIMAL(10,2)
        );
    END LOOP;

    -- Insert order custom fields
    FOR v_custom_field IN SELECT * FROM jsonb_array_elements(p_custom_fields)
    LOOP
        INSERT INTO order_custom_fields (
            order_id,
            custom_field_id,
            value
        ) VALUES (
            v_order.id,
            (v_custom_field->>'id')::UUID,
            v_custom_field->>'value'
        );
    END LOOP;

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the record_payment function
CREATE OR REPLACE FUNCTION record_payment(
    p_organization_id UUID,
    p_order_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method payment_method,
    p_payment_reference TEXT,
    p_recorded_by UUID
) RETURNS payments AS $$
DECLARE
    v_payment payments;
    v_order orders;
BEGIN
    -- Get the order
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Insert the payment
    INSERT INTO payments (
        organization_id,
        order_id,
        amount,
        payment_method,
        payment_reference,
        recorded_by
    ) VALUES (
        p_organization_id,
        p_order_id,
        p_amount,
        p_payment_method,
        p_payment_reference,
        p_recorded_by
    ) RETURNING * INTO v_payment;

    -- Update order outstanding balance and payment status
    UPDATE orders
    SET 
        outstanding_balance = outstanding_balance - p_amount,
        payment_status = CASE
            WHEN outstanding_balance - p_amount <= 0 THEN 'paid'
            WHEN outstanding_balance - p_amount < total_amount THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_order_id;

    RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-----------------------------------
-- Create the payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_reference TEXT,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS payments_organization_id_idx ON payments(organization_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_recorded_by_idx ON payments(recorded_by);

-- Create the record_payment function
CREATE OR REPLACE FUNCTION record_payment(
    p_organization_id UUID,
    p_order_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method payment_method,
    p_payment_reference TEXT,
    p_recorded_by UUID
) RETURNS payments AS $$
DECLARE
    v_payment payments;
    v_order orders;
BEGIN
    -- Get the order
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Insert the payment
    INSERT INTO payments (
        organization_id,
        order_id,
        amount,
        payment_method,
        payment_reference,
        recorded_by
    ) VALUES (
        p_organization_id,
        p_order_id,
        p_amount,
        p_payment_method,
        p_payment_reference,
        p_recorded_by
    ) RETURNING * INTO v_payment;

    -- Update order outstanding balance and payment status
    UPDATE orders
    SET 
        outstanding_balance = outstanding_balance - p_amount,
        payment_status = CASE
            WHEN outstanding_balance - p_amount <= 0 THEN 'paid'
            WHEN outstanding_balance - p_amount < total_amount THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_order_id;

    RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-----------------------------------


-- First, let's modify the order_custom_fields table to allow null custom_field_id
ALTER TABLE order_custom_fields 
ALTER COLUMN custom_field_id DROP NOT NULL;

-- Then update the create_order function to handle custom fields properly
CREATE OR REPLACE FUNCTION create_order(
    p_organization_id UUID,
    p_client_id UUID,
    p_description TEXT,
    p_due_date TIMESTAMP WITH TIME ZONE,
    p_total_amount DECIMAL(10,2),
    p_workers JSONB,
    p_services JSONB,
    p_custom_fields JSONB
) RETURNS orders AS $$
DECLARE
    v_order orders;
    v_worker JSONB;
    v_service JSONB;
    v_custom_field JSONB;
    v_order_number TEXT;
BEGIN
    -- Generate order number (format: ORD-YYYYMMDD-XXXX)
    SELECT 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
           LPAD(CAST(COALESCE(
               (SELECT MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER))
                FROM orders
                WHERE organization_id = p_organization_id
                AND order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'),
               0) + 1 AS TEXT), 4, '0')
    INTO v_order_number;

    -- Insert the order
    INSERT INTO orders (
        organization_id,
        order_number,
        client_id,
        description,
        due_date,
        status,
        total_amount,
        outstanding_balance,
        payment_status
    ) VALUES (
        p_organization_id,
        v_order_number,
        p_client_id,
        p_description,
        p_due_date,
        'draft',
        p_total_amount,
        p_total_amount,
        'unpaid'
    ) RETURNING * INTO v_order;

    -- Insert order workers
    FOR v_worker IN SELECT * FROM jsonb_array_elements(p_workers)
    LOOP
        INSERT INTO order_workers (
            order_id,
            worker_id,
            project_id,
            status
        ) VALUES (
            v_order.id,
            (v_worker->>'worker_id')::UUID,
            (v_worker->>'project_id')::UUID,
            'assigned'
        );
    END LOOP;

    -- Insert order services
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
        INSERT INTO order_services (
            order_id,
            service_id,
            quantity,
            cost
        ) VALUES (
            v_order.id,
            (v_service->>'service_id')::UUID,
            (v_service->>'quantity')::INTEGER,
            (v_service->>'cost')::DECIMAL(10,2)
        );
    END LOOP;

    -- Insert order custom fields only if they exist and have valid IDs
    IF p_custom_fields IS NOT NULL AND jsonb_array_length(p_custom_fields) > 0 THEN
        FOR v_custom_field IN SELECT * FROM jsonb_array_elements(p_custom_fields)
        LOOP
            IF v_custom_field->>'id' IS NOT NULL THEN
                INSERT INTO order_custom_fields (
                    order_id,
                    custom_field_id,
                    value
                ) VALUES (
                    v_order.id,
                    (v_custom_field->>'id')::UUID,
                    v_custom_field->>'value'
                );
            END IF;
        END LOOP;
    END IF;

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;