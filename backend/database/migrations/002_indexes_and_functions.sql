-- Migration: 002_indexes_and_functions
-- Description: Add indexes and utility functions for performance
-- Created: 2024-01-01

BEGIN;

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

COMMIT;