-- Supabase Database Schema for IT Ticketing Tool (Simplified)
-- Run this in your Supabase SQL editor step by step

-- Step 1: Create custom types
CREATE TYPE user_role AS ENUM ('user', 'support', 'admin', 'super_admin', 'site_admin');
CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Hold', 'Closed', 'Resolved');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_category AS ENUM ('Hardware', 'Software', 'Network', 'Access', 'Other');

-- Step 2: Create Users table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'user',
    active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    client_name TEXT,
    company_name TEXT,
    is_site_admin BOOLEAN DEFAULT false,
    login_activity JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create Clients table
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    contract_start DATE,
    contract_end DATE,
    site_admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create Tickets table
CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    display_id TEXT UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'Open',
    priority ticket_priority DEFAULT 'Medium',
    category ticket_category DEFAULT 'Other',
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_email TEXT NOT NULL,
    assigned_to_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_to_email TEXT,
    client_name TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    comments JSONB DEFAULT '[]',
    status_history JSONB DEFAULT '[]',
    assigned_to_history JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'info',
    related_ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX idx_tickets_reporter_id ON public.tickets(reporter_id);
CREATE INDEX idx_tickets_assigned_to_id ON public.tickets(assigned_to_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_client_name ON public.tickets(client_name);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_client_name ON public.users(client_name);

-- Step 7: Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create ticket ID sequence and function
CREATE SEQUENCE IF NOT EXISTS ticket_sequence START 1;

CREATE OR REPLACE FUNCTION generate_ticket_display_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.display_id := 'TICKET-' || LPAD(CAST(nextval('ticket_sequence') AS TEXT), 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_ticket_id BEFORE INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_display_id();

-- Step 10: Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies
-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'support')
        )
    );

-- Tickets policies
CREATE POLICY "Users can view their own tickets" ON public.tickets
    FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can update their own tickets" ON public.tickets
    FOR UPDATE USING (reporter_id = auth.uid());

CREATE POLICY "Support/Admin can view all tickets" ON public.tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'support')
        )
    );

CREATE POLICY "Support/Admin can update all tickets" ON public.tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'support')
        )
    );

CREATE POLICY "Site admin can view their client's tickets" ON public.tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'site_admin'
            AND client_name = public.tickets.client_name
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Clients policies
CREATE POLICY "All authenticated users can view clients" ON public.clients
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only super admins can manage clients" ON public.clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Step 12: Create user registration function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 14: Insert dummy client for testing
INSERT INTO public.clients (name, contact_email, contact_phone, address, contract_start, contract_end, site_admin)
VALUES (
    'Acme Corp',
    'admin@acme.com',
    '+1-555-0123',
    'New York, USA',
    '2022-01-15',
    '2025-12-31',
    'john.doe@acme.com'
) ON CONFLICT (name) DO NOTHING; 