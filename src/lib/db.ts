import { createClient } from "@libsql/client";

const globalForDb = globalThis as unknown as { db: DbWrapper | undefined };

function getDbUrl() {
  return process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
}

function getAuthToken() {
  return process.env.TURSO_AUTH_TOKEN || "";
}

class Statement {
  private sql: string;
  private client: ReturnType<typeof createClient>;

  constructor(client: ReturnType<typeof createClient>, sql: string) {
    this.client = client;
    this.sql = sql;
  }

  async run(...params: any[]) {
    const result = await this.client.execute({ sql: this.sql, args: params });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : 0,
    };
  }

  async get(...params: any[]) {
    const result = await this.client.execute({ sql: this.sql, args: params });
    const row = result.rows[0] as any;
    return row ? Object.assign({}, row) : undefined;
  }

  async all(...params: any[]) {
    const result = await this.client.execute({ sql: this.sql, args: params });
    return (result.rows as any[]).map((r: any) => Object.assign({}, r));
  }
}

class DbWrapper {
  private client: ReturnType<typeof createClient>;

  constructor() {
    const url = getDbUrl();
    const authToken = getAuthToken();
    this.client = createClient({ url, authToken: authToken || undefined });
    this.initSchema();
  }

  prepare(sql: string) {
    return new Statement(this.client, sql);
  }

  async exec(sql: string) {
    await this.client.executeMultiple(sql);
  }

  transaction<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => Promise<T> {
    return async (...args: unknown[]) => {
      await this.client.execute("BEGIN");
      try {
        const result = await fn(...args);
        await this.client.execute("COMMIT");
        return result;
      } catch (e) {
        await this.client.execute("ROLLBACK");
        throw e;
      }
    };
  }

  private async initSchema() {
    await this.exec(`
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

    const alterTable = async (sql: string) => {
      try {
        await this.exec(sql);
      } catch {
      }
    };

    await alterTable("ALTER TABLE products ADD COLUMN barcode TEXT;");
    await alterTable("ALTER TABLE products ADD COLUMN wholesale_price REAL;");
    await alterTable("ALTER TABLE products ADD COLUMN image_url TEXT;");
    await alterTable("ALTER TABLE products ADD COLUMN cost_price REAL;");
    await alterTable("ALTER TABLE products ADD COLUMN selling_price REAL;");
    await alterTable("ALTER TABLE products ADD COLUMN original_price REAL;");
    await alterTable("ALTER TABLE products ADD COLUMN unit_price REAL;");
    await alterTable("ALTER TABLE products ADD COLUMN price_per_case REAL;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN unit_cost REAL;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN case_cost REAL;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN case_quantity INTEGER;");

    await this.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        address TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        price REAL,
        quantity INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        batch_no TEXT NOT NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        expiry_date TEXT,
        cost_price REAL,
        received_date TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await alterTable("ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0;");
    await alterTable("ALTER TABLE products ADD COLUMN track_batches INTEGER DEFAULT 0;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE stock_movements ADD COLUMN variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE physical_audit_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE physical_audit_items ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash';");
    await alterTable("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0;");
    await alterTable("ALTER TABLE sales ADD COLUMN discount_type TEXT;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN discount REAL DEFAULT 0;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN discount_type TEXT;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE sale_items ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;");

    await this.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    const upsertSetting2 = this.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    await upsertSetting2.run("printer_type", "browser");
    await upsertSetting2.run("paper_width", "80");
    await upsertSetting2.run("receipt_header", "=== MY STORE ===");
    await upsertSetting2.run("receipt_footer", "Thank you! Visit again.");
    await upsertSetting2.run("receipt_copies", "1");
    await upsertSetting2.run("auto_print", "0");
    await upsertSetting2.run("store_name", "My Store");
    await upsertSetting2.run("store_address", "");
    await upsertSetting2.run("store_phone", "");
    await upsertSetting2.run("telegram_bot_token", "");
    await upsertSetting2.run("telegram_chat_ids", "");
    await upsertSetting2.run("telegram_notify_low_stock", "1");
    await upsertSetting2.run("telegram_notify_daily", "1");
    await upsertSetting2.run("telegram_enabled", "0");
    await this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'stock_manager')) DEFAULT 'cashier',
        pin TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await alterTable("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]';");

    await this.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('low_stock', 'expiring_batch', 'expired_batch', 'info')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS customer_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        discount_percent REAL DEFAULT 0,
        markup_percent REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customer_group_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price REAL NOT NULL,
        UNIQUE(group_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('customer', 'supplier')),
        reference_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')),
        due_date TEXT,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS debt_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS physical_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS physical_audit_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL REFERENCES physical_audits(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        expected_qty INTEGER NOT NULL,
        actual_qty INTEGER,
        difference INTEGER,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS cash_flow (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed', 'buy_x_get_y')),
        value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        buy_qty INTEGER DEFAULT 0,
        get_qty INTEGER DEFAULT 0,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        start_date TEXT,
        end_date TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS membership_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        min_spend REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        benefits TEXT
      );

      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES membership_tiers(id) ON DELETE SET NULL,
        points REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customer_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
        total REAL NOT NULL,
        delivery_address TEXT,
        delivery_fee REAL DEFAULT 0,
        sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customer_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        commission_type TEXT DEFAULT 'fixed' CHECK(commission_type IN ('fixed', 'percentage')),
        commission_value REAL DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES customer_orders(id) ON DELETE SET NULL,
        partner_id INTEGER REFERENCES delivery_partners(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
        fee REAL DEFAULT 0,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_data TEXT NOT NULL,
        total REAL NOT NULL,
        item_count INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

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

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        total REAL NOT NULL,
        item_count INTEGER NOT NULL,
        customer_type TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

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

    await alterTable("ALTER TABLE customer_orders ADD COLUMN sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL;");
    await alterTable("ALTER TABLE customers ADD COLUMN customer_type TEXT NOT NULL CHECK(customer_type IN ('wholesale', 'retail')) DEFAULT 'retail';");
    await alterTable("ALTER TABLE customers ADD COLUMN credit REAL DEFAULT 0;");

    await this.exec(`
      CREATE TABLE IF NOT EXISTS fb_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL UNIQUE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS fb_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        customer_name TEXT NOT NULL DEFAULT 'Facebook User',
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        total REAL NOT NULL DEFAULT 0,
        processed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await alterTable("ALTER TABLE fb_orders ADD COLUMN total REAL NOT NULL DEFAULT 0;");

    await this.exec(`
      CREATE TABLE IF NOT EXISTS livestreams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        facebook_page_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','live','ended','cancelled')),
        scheduled_at TEXT,
        started_at TEXT,
        ended_at TEXT,
        viewer_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        order_count INTEGER NOT NULL DEFAULT 0,
        revenue REAL NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS live_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livestream_id INTEGER NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        price_override REAL,
        max_quantity INTEGER,
        priority INTEGER NOT NULL DEFAULT 0,
        reserve_stock INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS live_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livestream_id INTEGER NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
        facebook_comment_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_avatar TEXT,
        customer_id TEXT NOT NULL,
        message TEXT NOT NULL,
        detected_keyword TEXT,
        detected_quantity INTEGER NOT NULL DEFAULT 1,
        matched_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        matched_product_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','ordered','ignored','blocked')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS live_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livestream_id INTEGER NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
        order_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_address TEXT,
        facebook_comment_id TEXT,
        total REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','processing','packed','delivery','completed','cancelled')),
        driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS live_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES live_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price REAL NOT NULL,
        total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES live_orders(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','consumed')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await alterTable("ALTER TABLE livestreams ADD COLUMN viewer_count INTEGER NOT NULL DEFAULT 0;");
    await alterTable("ALTER TABLE livestreams ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;");
    await alterTable("ALTER TABLE livestreams ADD COLUMN order_count INTEGER NOT NULL DEFAULT 0;");
    await alterTable("ALTER TABLE livestreams ADD COLUMN revenue REAL NOT NULL DEFAULT 0;");

    const userCount = (await this.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
    if (userCount === 0) {
      await this.prepare(
        "INSERT INTO users (name, email, password_hash, role, pin) VALUES (?, ?, ?, ?, ?)"
      ).run("Administrator", "nongsocheatra@gmail.com", "", "admin", "1234");
    } else {
      await this.prepare(
        "UPDATE users SET password_hash = '' WHERE email = ?"
      ).run("nongsocheatra@gmail.com");
    }
  }
}

const db = globalForDb.db ?? new DbWrapper();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export { db };
