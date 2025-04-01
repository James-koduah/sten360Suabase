-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the new user into public.users
    INSERT INTO public.users (id, auth_id, email, name, created_at)
    VALUES (
        gen_random_uuid(), -- Generate a new UUID for the public user
        NEW.id,           -- Store the auth.users id as auth_id
        NEW.email,        -- Copy the email from auth.users
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Try to get name from metadata, fallback to email
        NEW.created_at    -- Use the same creation timestamp
    )
    -- Handle case where user might already exist
    ON CONFLICT (auth_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
CREATE TRIGGER after_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();


CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_new_quantity INT
)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock_quantity = p_new_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION generate_sales_order_number()
RETURNS TRIGGER AS $$
DECLARE
    org_prefix TEXT;
    current_ym TEXT;
    next_number INTEGER;
    sequence_name TEXT;
    org_exists BOOLEAN;
BEGIN
    -- Validate organization exists
    SELECT EXISTS (
        SELECT 1 FROM organizations WHERE id = NEW.organization_id
    ) INTO org_exists;

    IF NOT org_exists THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;

    -- Get organization name prefix
    SELECT COALESCE(
        (SELECT string_agg(LEFT(word, 1), '')
        FROM (
            SELECT regexp_split_to_table(UPPER(name), '\\s+') as word
            FROM organizations
            WHERE id = NEW.organization_id
        ) words),
        'SO'
    ) INTO org_prefix;

    -- Get current year and month
    current_ym := to_char(NEW.created_at, 'YYYYMM');
    
    -- Create sequence name (include organization_id and year-month)
    sequence_name := 'sales_order_seq_' || NEW.organization_id || '_' || current_ym;
    
    -- Create sequence if needed
    EXECUTE format('
        CREATE SEQUENCE IF NOT EXISTS %I 
        START WITH 1001 
        INCREMENT BY 1 
        NO MINVALUE 
        NO MAXVALUE 
        CACHE 1', 
        sequence_name
    );
    
    -- Get next number with retry logic
    BEGIN
        EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
    EXCEPTION WHEN OTHERS THEN
        -- If sequence doesn't exist, create it and try again
        EXECUTE format('
            CREATE SEQUENCE IF NOT EXISTS %I 
            START WITH 1001 
            INCREMENT BY 1 
            NO MINVALUE 
            NO MAXVALUE 
            CACHE 1', 
            sequence_name
        );
        EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
    END;

    -- Set order number with format: ORG-PREFIX-YYYYMM-XXXX
    NEW.order_number := org_prefix || '-' || current_ym || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and raise exception
        RAISE EXCEPTION 'Error generating sales order number: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create trigger update_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION update_updated_at_column ();

create trigger generate_sales_order_number_trigger BEFORE INSERT on sales_orders for EACH row
execute FUNCTION generate_sales_order_number ();

create trigger set_sales_order_number BEFORE INSERT on sales_orders for EACH row
execute FUNCTION generate_sales_order_number ();

CREATE OR REPLACE FUNCTION calculate_item_total_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_order(
    p_organization_id UUID,
    p_client_id UUID,
    p_description TEXT,
    p_due_date DATE,
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
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    -- Generate order number with retry logic
    LOOP
        SELECT 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD(CAST(COALESCE(
                   (SELECT MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER))
                    FROM orders
                    WHERE organization_id = p_organization_id
                    AND order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'),
                   0) + 1 AS TEXT), 4, '0') || '-' ||
               LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0')
        INTO v_order_number;

        BEGIN
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
                'pending',
                p_total_amount,
                p_total_amount,
                'unpaid'
            ) RETURNING * INTO v_order;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_attempts := v_attempts + 1;
            IF v_attempts >= v_max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique order number after % attempts', v_max_attempts;
            END IF;
            PERFORM pg_sleep(0.1);
        END;
    END LOOP;

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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tasks_for_order_workers()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id uuid;
  v_rate numeric;
  v_order_number text;
BEGIN
  -- Get organization ID and order number first
  SELECT o.organization_id, o.order_number INTO v_organization_id, v_order_number
  FROM orders o
  WHERE o.id = NEW.order_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or missing organization_id';
  END IF;

  -- Get the worker's rate for this project
  SELECT rate INTO v_rate
  FROM worker_project_rates
  WHERE worker_id = NEW.worker_id AND project_id = NEW.project_id;

  -- If no rate found, use 0 as default
  IF v_rate IS NULL THEN
    v_rate := 0;
    RAISE NOTICE 'No rate found for worker % and project %. Using default rate of 0', NEW.worker_id, NEW.project_id;
  END IF;

  -- Create a task for the worker
  INSERT INTO tasks (
    organization_id,
    worker_id,
    project_id,
    description,
    date,
    status,
    status_changed_at,
    amount,
    order_id
  )
  SELECT
    v_organization_id,
    NEW.worker_id,
    NEW.project_id,
    CASE 
      WHEN o.description IS NOT NULL AND o.description != '' 
      THEN 'Order ' || o.order_number || ': ' || o.description
      ELSE 'Order ' || o.order_number
    END,
    COALESCE(o.due_date, CURRENT_DATE),
    'pending',
    now(),
    v_rate,
    NEW.order_id
  FROM orders o
  WHERE o.id = NEW.order_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create task for order % (worker: %, project: %): %', 
      v_order_number, NEW.worker_id, NEW.project_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER create_tasks_for_order_workers_trigger
AFTER INSERT ON order_workers
FOR EACH ROW
EXECUTE FUNCTION create_tasks_for_order_workers();

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
                       LPAD(COALESCE(
                           (SELECT COUNT(*) + 1 FROM orders 
                            WHERE organization_id = NEW.organization_id 
                            AND DATE(created_at) = CURRENT_DATE)::text,
                           '1'
                       ), 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the new user into public.users
    INSERT INTO public.users (id, auth_id, email, name, created_at)
    VALUES (
        gen_random_uuid(), -- Generate a new UUID for the public user
        NEW.id,           -- Store the auth.users id as auth_id
        NEW.email,        -- Copy the email from auth.users
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Try to get name from metadata, fallback to email
        NEW.created_at    -- Use the same creation timestamp
    )
    -- Handle case where user might already exist
    ON CONFLICT (auth_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to record payments
CREATE OR REPLACE FUNCTION record_payment(
    p_organization_id UUID,
    p_order_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR,
    p_payment_reference VARCHAR,
    p_recorded_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_payment_id INTEGER;
    v_payment JSONB;
    v_is_sales_order BOOLEAN;
    v_order_exists BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'order_id cannot be null';
    END IF;
    
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'amount must be greater than 0';
    END IF;
    
    IF p_payment_method IS NULL THEN
        RAISE EXCEPTION 'payment_method cannot be null';
    END IF;
    
    IF p_recorded_by IS NULL THEN
        RAISE EXCEPTION 'recorded_by cannot be null';
    END IF;

    -- Check if order exists in either table
    SELECT EXISTS (
        SELECT 1 FROM sales_orders WHERE id = p_order_id
        UNION
        SELECT 1 FROM orders WHERE id = p_order_id
    ) INTO v_order_exists;

    IF NOT v_order_exists THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Check if this is a sales order or a regular order
    SELECT EXISTS (
        SELECT 1 FROM sales_orders WHERE id = p_order_id
    ) INTO v_is_sales_order;

    -- Insert payment record
    INSERT INTO payments (
        reference_id,
        reference_type,
        organization_id,
        amount,
        payment_method,
        transaction_reference,
        recorded_by
    )
    VALUES (
        p_order_id,
        CASE WHEN v_is_sales_order THEN 'sales_order' ELSE 'service_order' END,
        p_organization_id,
        p_amount,
        p_payment_method,
        p_payment_reference,
        p_recorded_by
    )
    RETURNING id INTO v_payment_id;

    -- Update outstanding balance based on order type
    IF v_is_sales_order THEN
        UPDATE sales_orders
        SET 
            outstanding_balance = GREATEST(0, outstanding_balance - p_amount),
            payment_status = CASE 
                WHEN outstanding_balance - p_amount <= 0 THEN 'paid'
                ELSE 'partially_paid'
            END
        WHERE id = p_order_id;
    ELSE
        UPDATE orders
        SET 
            outstanding_balance = GREATEST(0, outstanding_balance - p_amount),
            payment_status = CASE 
                WHEN outstanding_balance - p_amount <= 0 THEN 'paid'
                ELSE 'partially_paid'
            END
        WHERE id = p_order_id;
    END IF;

    -- Get payment details
    SELECT jsonb_build_object(
        'id', p.id,
        'reference_id', p.reference_id,
        'reference_type', p.reference_type,
        'organization_id', p.organization_id,
        'amount', p.amount,
        'payment_method', p.payment_method,
        'transaction_reference', p.transaction_reference,
        'recorded_by', p.recorded_by,
        'created_at', p.created_at
    ) INTO v_payment
    FROM payments p
    WHERE p.id = v_payment_id;

    RETURN v_payment;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any changes if there's an error
        RAISE EXCEPTION 'Error recording payment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 