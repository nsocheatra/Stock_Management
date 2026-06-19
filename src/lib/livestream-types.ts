// Live Stream session
export type LiveStatus = 'draft' | 'live' | 'ended' | 'cancelled';
export interface LiveStream {
  id: number;
  title: string;
  description: string | null;
  facebook_page_id: string | null;
  status: LiveStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  comment_count: number;
  order_count: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

// Live Product (keyword mapping for a live session)
export interface LiveProduct {
  id: number;
  livestream_id: number;
  product_id: number;
  keyword: string;
  price_override: number | null;
  max_quantity: number | null;
  priority: number;
  reserve_stock: number;
  product_name: string;
  product_sku: string;
  product_price: number;
  product_image: string | null;
  stock: number;
  sold: number;
}

// Live Comment from Facebook
export interface LiveComment {
  id: number;
  livestream_id: number;
  facebook_comment_id: string;
  customer_name: string;
  customer_avatar: string | null;
  customer_id: string;
  message: string;
  detected_keyword: string | null;
  detected_quantity: number;
  matched_product_id: number | null;
  matched_product_name: string | null;
  status: 'pending' | 'matched' | 'ordered' | 'ignored' | 'blocked';
  created_at: string;
}

// Live Order
export type LiveOrderStatus = 'draft' | 'processing' | 'packed' | 'delivery' | 'completed' | 'cancelled';
export interface LiveOrder {
  id: number;
  livestream_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  facebook_comment_id: string | null;
  total: number;
  status: LiveOrderStatus;
  driver_id: number | null;
  driver_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: LiveOrderItem[];
}

export interface LiveOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

// Facebook Page connection
export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  app_id: string;
  business_id: string | null;
  webhook_status: 'active' | 'inactive' | 'expired';
  token_expires_at: string | null;
}

// Statistics
export interface LiveStats {
  viewers: number;
  comments: number;
  orders: number;
  revenue: number;
  conversion_rate: number;
  top_product: string | null;
  orders_per_minute: number;
}

// Notification event types for Pusher
export type LiveEvent =
  | { type: 'new_comment'; comment: LiveComment }
  | { type: 'new_order'; order: LiveOrder }
  | { type: 'order_updated'; order: LiveOrder }
  | { type: 'stock_updated'; product_id: number; new_stock: number }
  | { type: 'viewer_updated'; count: number };

// Keyword detection result
export interface KeywordDetection {
  keyword: string;
  quantity: number;
  product: LiveProduct | null;
  raw: string;
}
