-- Supabase Database Schema for IT Ticketing Tool
-- Run this SQL in your Supabase SQL editor to create the database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'support', 'admin', 'super_admin', 'site_admin');
CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Hold', 'Resolved', 'Cancelled');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_category AS ENUM ('software', 'hardware', 'troubleshoot');
CREATE TYPE notification_type AS ENUM (
    'ticket_created', 'ticket_assigned', 'ticket_unassigned', 'ticket_reassigned_from',
    'ticket_cancelled', 'ticket_cancelled_assigned', 'new_comment_on_my_ticket',
    'new_comment_on_assigned_ticket'
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'user',
    is_site_admin BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    name VARCHAR(200),
    employee_id VARCHAR(50),
    client_name VARCHAR(200),
    company_name VARCHAR(200),
    last_login TIMESTAMP WITH TIME ZONE,
    login_activity JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_id VARCHAR(20) UNIQUE NOT NULL,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reporter_email VARCHAR(255) NOT NULL,
    reporter_name VARCHAR(200),
    reporter_first_name VARCHAR(100),
    reporter_last_name VARCHAR(100),
    request_for_email VARCHAR(255) NOT NULL,
    category ticket_category NOT NULL,
    short_description VARCHAR(250) NOT NULL,
    long_description TEXT,
    contact_number VARCHAR(50),
    priority ticket_priority DEFAULT 'Low',
    hostname_asset_id VARCHAR(100),
    status ticket_status DEFAULT 'Open',
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_email VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER, -- in minutes
    time_spent_minutes INTEGER,
    closure_notes TEXT,
    closed_by_email VARCHAR(255),
    client_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table (separate from tickets for better normalization)
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    commenter_name VARCHAR(200) NOT NULL,
    commenter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_by_email VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status history table
CREATE TABLE ticket_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    old_status ticket_status,
    new_status ticket_status NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment history table
CREATE TABLE ticket_assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    old_assigned_to VARCHAR(255),
    new_assigned_to VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Priority history table
CREATE TABLE ticket_priority_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    old_priority ticket_priority,
    new_priority ticket_priority NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category history table
CREATE TABLE ticket_category_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    old_category ticket_category,
    new_category ticket_category NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type notification_type,
    read BOOLEAN DEFAULT FALSE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table (for audit logging)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client_name ON users(client_name);

CREATE INDEX idx_tickets_reporter_id ON tickets(reporter_id);
CREATE INDEX idx_tickets_assigned_to_id ON tickets(assigned_to_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_client_name ON tickets(client_name);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_display_id ON tickets(display_id);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX idx_ticket_assignment_history_ticket_id ON ticket_assignment_history(ticket_id);
CREATE INDEX idx_ticket_priority_history_ticket_id ON ticket_priority_history(ticket_id);
CREATE INDEX idx_ticket_category_history_ticket_id ON ticket_category_history(ticket_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_action ON activities(action);
CREATE INDEX idx_activities_resource_type ON activities(resource_type);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_priority_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_category_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - you may need to adjust based on your requirements)
-- Users can read their own data and admins can read all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'site_admin'));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Tickets policies
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (
        reporter_id = auth.uid() OR 
        assigned_to_id = auth.uid() OR 
        auth.jwt() ->> 'role' IN ('support', 'admin', 'super_admin', 'site_admin')
    );

CREATE POLICY "Users can create tickets" ON tickets
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update tickets" ON tickets
    FOR UPDATE USING (
        reporter_id = auth.uid() OR 
        assigned_to_id = auth.uid() OR 
        auth.jwt() ->> 'role' IN ('support', 'admin', 'super_admin', 'site_admin')
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Activities policies (admin only)
CREATE POLICY "Admins can view all activities" ON activities
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- Comments policies
CREATE POLICY "Users can view ticket comments" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = ticket_comments.ticket_id 
            AND (
                tickets.reporter_id = auth.uid() OR 
                tickets.assigned_to_id = auth.uid() OR 
                auth.jwt() ->> 'role' IN ('support', 'admin', 'super_admin', 'site_admin')
            )
        )
    );

CREATE POLICY "Users can create comments" ON ticket_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = ticket_comments.ticket_id 
            AND (
                tickets.reporter_id = auth.uid() OR 
                tickets.assigned_to_id = auth.uid() OR 
                auth.jwt() ->> 'role' IN ('support', 'admin', 'super_admin', 'site_admin')
            )
        )
    );

-- Function to generate display ID
CREATE OR REPLACE FUNCTION generate_ticket_display_id()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 3) AS INTEGER)), 0) + 1
    INTO next_id
    FROM tickets
    WHERE display_id ~ '^TT[0-9]+$';
    
    RETURN 'TT' || LPAD(next_id::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set display_id on ticket creation
CREATE OR REPLACE FUNCTION set_ticket_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
        NEW.display_id = generate_ticket_display_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic display_id generation
CREATE TRIGGER set_ticket_display_id_trigger
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_display_id();
