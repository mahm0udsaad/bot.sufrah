-- Seed dummy data for testing the dashboard
-- This will be populated after a user signs up with their phone number

-- Sample conversations (will be created dynamically when user signs up)
-- Sample messages (will be created dynamically)
-- Sample templates for the restaurant

-- Insert some default message templates that every restaurant gets
INSERT INTO templates (
  user_id, name, category, body_text, header_type, header_content, footer_text, status
) 
SELECT 
  u.id,
  'Welcome Message',
  'greeting',
  'Welcome to {{business_name}}! 🍽️ We''re excited to serve you. How can we help you today?',
  'text',
  'Welcome!',
  'Reply MENU to see our menu',
  'approved'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.name = 'Welcome Message'
);

INSERT INTO templates (
  user_id, name, category, body_text, header_type, header_content, footer_text, status
) 
SELECT 
  u.id,
  'Order Confirmation',
  'order',
  'Thank you for your order! 📋\n\nOrder Details:\n{{order_items}}\n\nTotal: {{total_amount}}\n\nEstimated delivery: {{delivery_time}}',
  'text',
  'Order Confirmed ✅',
  'Track your order in real-time',
  'approved'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.name = 'Order Confirmation'
);

INSERT INTO templates (
  user_id, name, category, body_text, header_type, header_content, footer_text, status
) 
SELECT 
  u.id,
  'Menu Request',
  'menu',
  'Here''s our delicious menu! 📖\n\n🍕 Pizza - Starting from 25 SAR\n🍔 Burgers - Starting from 20 SAR\n🥗 Salads - Starting from 15 SAR\n🍰 Desserts - Starting from 12 SAR\n\nReply with the item name to order!',
  'text',
  'Our Menu 📋',
  'Fresh ingredients, great taste!',
  'approved'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.name = 'Menu Request'
);

-- Sample dummy conversations and messages for demonstration
-- These will be created when the bot API sends real data
