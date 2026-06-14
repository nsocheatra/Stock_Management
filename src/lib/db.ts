import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const globalForDb = globalThis as unknown as { db: Database.Database };

function getDbPath() {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const relativePath = dbUrl.replace("file:", "");
  return path.resolve(process.cwd(), relativePath);
}

function createDb() {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

      CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      wholesale_price REAL,
      quantity INTEGER DEFAULT 0,
      category TEXT,
      min_stock INTEGER DEFAULT 5,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      barcode TEXT,
      image_url TEXT,
      cost_price REAL,
      selling_price REAL,
      original_price REAL,
      unit_price REAL,
      price_per_case REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL,
      unit_cost REAL,
      case_cost REAL,
      case_quantity INTEGER,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec("ALTER TABLE products ADD COLUMN barcode TEXT;");
  } catch (err: any) {
    if (!err.message.includes("duplicate column name")) {
      throw err;
    }
  }
  try {
    db.exec("ALTER TABLE products ADD COLUMN wholesale_price REAL;");
  } catch (err: any) {
    if (!err.message.includes("duplicate column name")) {
      throw err;
    }
  }
  try {
    db.exec("ALTER TABLE products ADD COLUMN image_url TEXT;");
  } catch (err: any) {
    if (!err.message.includes("duplicate column name")) {
      throw err;
    }
  }
  try {
    db.exec("ALTER TABLE products ADD COLUMN cost_price REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE products ADD COLUMN selling_price REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE products ADD COLUMN original_price REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE products ADD COLUMN unit_price REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE fb_orders ADD COLUMN comment_deleted INTEGER DEFAULT 0;");
  } catch {}
  try {
    db.exec("ALTER TABLE products ADD COLUMN price_per_case REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE stock_movements ADD COLUMN unit_cost REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE stock_movements ADD COLUMN case_cost REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE stock_movements ADD COLUMN case_quantity INTEGER;");
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS fb_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec("ALTER TABLE fb_keywords ADD COLUMN quantity INTEGER DEFAULT 1;");
  } catch (err: any) {
    if (!err.message.includes("duplicate column name")) {
      throw err;
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS fb_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      comment_text TEXT,
      keyword TEXT,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'cancelled')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fb_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("page_name", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("access_token", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("page_id", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("app_id", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("app_secret", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("auto_reply", "✅ Thanks {{name}}! Your order for {{product}} x{{qty}} is confirmed.");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("auto_reply_not_found", "Hi {{name}}, we couldn't find a product matching your comment. Please use a valid product keyword.");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("listening_enabled", "0");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("match_mode", "contains");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("fb_user_id", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("fb_user_name", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("fb_pages", "");
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("fb_businesses", "");
  const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  db.prepare("INSERT OR IGNORE INTO fb_settings (key, value) VALUES (?, ?)").run("verify_token", token);

  // Printer settings
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("printer_type", "browser");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("paper_width", "80");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("receipt_header", "=== MY STORE ===");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("receipt_footer", "Thank you! Visit again.");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("receipt_copies", "1");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("auto_print", "0");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("store_name", "My Store");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("store_address", "");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("store_phone", "");

  // Telegram settings
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("telegram_bot_token", "");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("telegram_chat_ids", "");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("telegram_notify_low_stock", "1");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("telegram_notify_daily", "1");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("telegram_enabled", "0");

  // Messenger (Facebook Chatbot) settings
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("messenger_page_token", "");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("messenger_verify_token", Math.random().toString(36).slice(2, 10));
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("messenger_greeting", "Welcome! Type a product name to search, or type 'menu' for options.");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("messenger_not_found", "Sorry, we couldn't find that product. Try a different name.");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("messenger_enabled", "0");

  // Users & auth
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')) DEFAULT 'cashier',
      pin TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create default admin if no users exist
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users (name, email, password_hash, role, pin) VALUES (?, ?, ?, ?, ?)").run(
      "Administrator", "admin@system.local", hash, "admin", "1234"
    );
  }

  // Messenger chatbot tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      response TEXT NOT NULL,
      match_mode TEXT DEFAULT 'contains' CHECK(match_mode IN ('contains', 'exact', 'starts')),
      category TEXT DEFAULT 'general',
      enabled INTEGER DEFAULT 1,
      times_triggered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE messenger_rules ADD COLUMN category TEXT DEFAULT 'general'");
  } catch {}
  try {
    db.exec("ALTER TABLE messenger_rules ADD COLUMN times_triggered INTEGER DEFAULT 0");
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_quick_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      payload TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      sender_name TEXT DEFAULT 'Unknown',
      last_message TEXT,
      unread INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE messenger_conversations ADD COLUMN tags TEXT DEFAULT ''");
  } catch {}
  try {
    db.exec("ALTER TABLE messenger_conversations ADD COLUMN assigned_to TEXT DEFAULT ''");
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT 'Untitled',
      message TEXT NOT NULL,
      recipient_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sending', 'sent', 'failed')),
      scheduled_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE messenger_broadcasts ADD COLUMN name TEXT DEFAULT 'Untitled'");
  } catch {}
  try {
    db.exec("ALTER TABLE messenger_broadcasts ADD COLUMN scheduled_at TEXT");
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS messenger_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // AI settings
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_enabled", "0");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_model", "gpt-4o-mini");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_provider", "openai");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_system_prompt", "You are a helpful customer service assistant for a store. Answer questions about products, orders, and store policies. Be concise and friendly.");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_temperature", "0.7");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_max_tokens", "500");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_persona_tone", "friendly");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("ai_context_messages", "5");

  // Receipts table for storing completed sale receipts
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_data TEXT NOT NULL,
      total REAL NOT NULL,
      item_count INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      customer_type TEXT NOT NULL CHECK(customer_type IN ('wholesale', 'retail')) DEFAULT 'retail',
      credit REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE customers ADD COLUMN customer_type TEXT NOT NULL CHECK(customer_type IN ('wholesale', 'retail')) DEFAULT 'retail'");
  } catch {}
  try {
    db.exec("ALTER TABLE customers ADD COLUMN credit REAL DEFAULT 0");
  } catch {}

  // Sales
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      total REAL NOT NULL,
      item_count INTEGER NOT NULL,
      customer_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      sku TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL
    );
  `);
}


export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
