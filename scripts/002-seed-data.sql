-- Adding sample data for development and testing
-- Sample user
INSERT INTO users (id, phone_number, name, email, is_verified) 
VALUES ('user-1', '+1234567890', 'Ahmed Hassan', 'ahmed@sufrah.com', true)
ON CONFLICT (phone_number) DO NOTHING;

-- Sample restaurant profile
INSERT INTO restaurant_profiles (
  user_id, business_name, business_type, phone_number, whatsapp_number,
  address, city, country, cuisine_type, operating_hours, delivery_zones, payment_methods, is_active
) VALUES (
  'user-1', 'Sufrah Restaurant', 'restaurant', '+1234567890', '+1234567890',
  '123 Main Street', 'Dubai', 'UAE', 'Middle Eastern',
  '{"monday": {"open": "09:00", "close": "23:00"}, "tuesday": {"open": "09:00", "close": "23:00"}}',
  '["Downtown", "Marina", "JLT"]',
  '["cash", "card", "digital_wallet"]',
  true
) ON CONFLICT DO NOTHING;

-- Sample conversations
INSERT INTO conversations (id, user_id, customer_phone, customer_name, status, window_expires_at) VALUES
('conv-1', 'user-1', '+9876543210', 'Sarah Ahmed', 'active', NOW() + INTERVAL '20 hours'),
('conv-2', 'user-1', '+9876543211', 'Mohammed Ali', 'active', NOW() + INTERVAL '15 hours'),
('conv-3', 'user-1', '+9876543212', 'Fatima Khan', 'closed', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Sample messages
INSERT INTO messages (conversation_id, sender_type, content, message_type, sent_at) VALUES
('conv-1', 'customer', 'Hi, I would like to order some food', 'text', NOW() - INTERVAL '2 hours'),
('conv-1', 'bot', 'Welcome to Sufrah! I can help you place an order. What would you like today?', 'text', NOW() - INTERVAL '2 hours'),
('conv-1', 'customer', 'I want 2 shawarma and 1 hummus', 'text', NOW() - INTERVAL '1 hour'),
('conv-2', 'customer', 'Do you deliver to Marina?', 'text', NOW() - INTERVAL '30 minutes'),
('conv-2', 'bot', 'Yes, we deliver to Marina! Delivery time is 30-45 minutes.', 'text', NOW() - INTERVAL '25 minutes')
ON CONFLICT DO NOTHING;

-- Sample templates
INSERT INTO templates (user_id, name, category, body_text, status, usage_count) VALUES
('user-1', 'Welcome Message', 'greeting', 'Welcome to {{restaurant_name}}! How can I help you today?', 'approved', 45),
('user-1', 'Order Confirmation', 'order', 'Your order #{{order_id}} has been confirmed. Total: {{total_amount}}. Estimated delivery: {{delivery_time}}.', 'approved', 23),
('user-1', 'Delivery Update', 'notification', 'Your order is on the way! Our driver will arrive in {{eta}} minutes.', 'approved', 12)
ON CONFLICT DO NOTHING;

-- Sample orders
INSERT INTO orders (conversation_id, customer_phone, customer_name, items, total_amount, status) VALUES
('conv-1', '+9876543210', 'Sarah Ahmed', '[{"name": "Chicken Shawarma", "quantity": 2, "price": 25}, {"name": "Hummus", "quantity": 1, "price": 15}]', 65.00, 'confirmed'),
('conv-2', '+9876543211', 'Mohammed Ali', '[{"name": "Mixed Grill", "quantity": 1, "price": 45}]', 45.00, 'preparing')
ON CONFLICT DO NOTHING;
