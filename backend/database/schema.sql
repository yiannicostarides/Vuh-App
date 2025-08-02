-- Grocery Deals App Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE store_chain AS ENUM ('publix', 'kroger');
CREATE TYPE deal_type AS ENUM ('bogo', 'discount', 'coupon');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    max_radius DECIMAL(5,2) DEFAULT 10.0,
    preferred_stores TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    notification_deal_expiration BOOLEAN DEFAULT true,
    notification_new_deals BOOLEAN DEFAULT true,
    notification_price_drops BOOLEAN DEFAULT true,
    notification_push_enabled BOOLEAN DEFAULT true,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    location_last_updated TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Store locations table
CREATE TABLE store_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_chain store_chain NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    phone_number VARCHAR(20),
    hours_monday_open TIME,
    hours_monday_close TIME,
    hours_monday_closed BOOLEAN DEFAULT false,
    hours_tuesday_open TIME,
    hours_tuesday_close TIME,
    hours_tuesday_closed BOOLEAN DEFAULT false,
    hours_wednesday_open TIME,
    hours_wednesday_close TIME,
    hours_wednesday_closed BOOLEAN DEFAULT false,
    hours_thursday_open TIME,
    hours_thursday_close TIME,
    hours_thursday_closed BOOLEAN DEFAULT false,
    hours_friday_open TIME,
    hours_friday_close TIME,
    hours_friday_closed BOOLEAN DEFAULT false,
    hours_saturday_open TIME,
    hours_saturday_close TIME,
    hours_saturday_closed BOOLEAN DEFAULT false,
    hours_sunday_open TIME,
    hours_sunday_close TIME,
    hours_sunday_closed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES store_locations(id),
    store_name store_chain NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    deal_type deal_type NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(100) NOT NULL,
    item_ids TEXT[] DEFAULT '{}',
    restrictions TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    scraped_at TIMESTAMP WITH TIME ZONE,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deal store locations junction table (many-to-many)
CREATE TABLE deal_store_locations (
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    store_location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
    PRIMARY KEY (deal_id, store_location_id)
);

-- Shopping list items table
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    priority priority_level DEFAULT 'medium',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification subscriptions table
CREATE TABLE notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_token)
);

-- Price comparison cache table
CREATE TABLE price_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    store_prices JSONB NOT NULL,
    best_value_store_id UUID,
    best_value_price DECIMAL(10,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

-- Create indexes for performance
CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_users_location ON users(location_latitude, location_longitude) WHERE location_latitude IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX idx_store_locations_chain ON store_locations(store_chain);
CREATE INDEX idx_store_locations_location ON store_locations(latitude, longitude);
CREATE INDEX idx_store_locations_active ON store_locations(is_active) WHERE is_active = true;

CREATE INDEX idx_deals_store_name ON deals(store_name);
CREATE INDEX idx_deals_category ON deals(category);
CREATE INDEX idx_deals_deal_type ON deals(deal_type);
CREATE INDEX idx_deals_valid_dates ON deals(valid_from, valid_until);
CREATE INDEX idx_deals_active ON deals(is_active) WHERE is_active = true;
CREATE INDEX idx_deals_discount ON deals(discount_percentage);
CREATE INDEX idx_deals_price ON deals(sale_price);

CREATE INDEX idx_shopping_list_user_id ON shopping_list_items(user_id);
CREATE INDEX idx_shopping_list_deal_id ON shopping_list_items(deal_id);
CREATE INDEX idx_shopping_list_category ON shopping_list_items(category);
CREATE INDEX idx_shopping_list_priority ON shopping_list_items(priority);

CREATE INDEX idx_notifications_user_id ON notification_subscriptions(user_id);
CREATE INDEX idx_notifications_active ON notification_subscriptions(is_active) WHERE is_active = true;

CREATE INDEX idx_price_comparisons_item ON price_comparisons(item_name);
CREATE INDEX idx_price_comparisons_expires ON price_comparisons(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_locations_updated_at BEFORE UPDATE ON store_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_subscriptions_updated_at BEFORE UPDATE ON notification_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 3959; -- Earth's radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    a := SIN(dLat/2) * SIN(dLat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;