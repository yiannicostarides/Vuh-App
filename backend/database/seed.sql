-- Seed data for Grocery Deals App

BEGIN;

-- Insert sample store locations
INSERT INTO store_locations (id, store_chain, name, address, latitude, longitude, phone_number,
    hours_monday_open, hours_monday_close, hours_tuesday_open, hours_tuesday_close,
    hours_wednesday_open, hours_wednesday_close, hours_thursday_open, hours_thursday_close,
    hours_friday_open, hours_friday_close, hours_saturday_open, hours_saturday_close,
    hours_sunday_open, hours_sunday_close) VALUES

-- Publix locations
('550e8400-e29b-41d4-a716-446655440001', 'publix', 'Publix Super Market at Midtown Plaza', '1234 Main St, Atlanta, GA 30309', 33.7849, -84.3885, '(404) 555-0101',
    '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '08:00', '21:00'),

('550e8400-e29b-41d4-a716-446655440002', 'publix', 'Publix Super Market at Buckhead', '5678 Peachtree Rd, Atlanta, GA 30326', 33.8484, -84.3781, '(404) 555-0102',
    '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '07:00', '22:00', '08:00', '21:00'),

-- Kroger locations
('550e8400-e29b-41d4-a716-446655440003', 'kroger', 'Kroger Marketplace', '9876 Piedmont Ave, Atlanta, GA 30309', 33.7901, -84.3821, '(404) 555-0201',
    '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '07:00', '22:00'),

('550e8400-e29b-41d4-a716-446655440004', 'kroger', 'Kroger Virginia Highland', '1456 Virginia Ave, Atlanta, GA 30306', 33.7701, -84.3560, '(404) 555-0202',
    '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '06:00', '23:00', '07:00', '22:00');

-- Insert sample deals
INSERT INTO deals (id, store_id, store_name, title, description, original_price, sale_price, discount_percentage, deal_type, valid_from, valid_until, category, item_ids, restrictions) VALUES

-- Publix deals
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'publix', 'Buy One Get One Free Cereal', 'Select Kellogg''s cereals including Frosted Flakes, Corn Flakes, and Rice Krispies', 4.99, 2.50, 50.0, 'bogo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Breakfast', ARRAY['cereal-001', 'cereal-002'], 'Limit 2 per customer'),

('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'publix', 'BOGO Pasta Sauce', 'Ragu and Prego pasta sauces', 2.49, 1.25, 50.0, 'bogo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '5 days', 'Pantry', ARRAY['sauce-001', 'sauce-002'], NULL),

('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'publix', '25% Off Organic Produce', 'All organic fruits and vegetables', 5.99, 4.49, 25.0, 'discount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3 days', 'Produce', ARRAY['produce-001'], NULL),

-- Kroger deals
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'kroger', 'Digital Coupon: $2 Off Tide Detergent', 'Tide liquid laundry detergent, 100 oz', 12.99, 10.99, 15.4, 'coupon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '10 days', 'Household', ARRAY['detergent-001'], 'Digital coupon must be loaded to card'),

('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'kroger', '30% Off Fresh Meat', 'Ground beef, chicken breast, and pork chops', 8.99, 6.29, 30.0, 'discount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 days', 'Meat', ARRAY['meat-001', 'meat-002'], 'Family pack sizes only'),

('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', 'kroger', 'Buy 2 Get 1 Free Yogurt', 'Chobani Greek yogurt cups', 1.29, 0.86, 33.3, 'bogo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 days', 'Dairy', ARRAY['yogurt-001'], 'Mix and match flavors');

-- Link deals to store locations
INSERT INTO deal_store_locations (deal_id, store_location_id) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004');

-- Insert sample user
INSERT INTO users (id, device_id, max_radius, preferred_stores, categories, location_latitude, location_longitude, location_last_updated) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'test-device-001', 15.0, ARRAY['publix', 'kroger'], ARRAY['Produce', 'Dairy', 'Breakfast'], 33.7849, -84.3885, CURRENT_TIMESTAMP);

-- Insert sample shopping list items
INSERT INTO shopping_list_items (id, user_id, deal_id, item_name, quantity, priority, category, notes) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Frosted Flakes Cereal', 2, 'high', 'Breakfast', 'Kids love this brand'),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'Organic Bananas', 1, 'medium', 'Produce', 'For smoothies'),
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440006', 'Greek Yogurt', 3, 'low', 'Dairy', 'Vanilla and strawberry flavors');

COMMIT;