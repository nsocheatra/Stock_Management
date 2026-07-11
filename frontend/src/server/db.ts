import "server-only";
import { Pool } from "pg";
import { hashPassword } from "./crypto";

const globalForDb = globalThis as unknown as { db: DbWrapper | undefined };

function getDbUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL environment variable is required in production");
    }
    console.warn("DATABASE_URL not set, using SQLite fallback (dev.db)");
    return "";
  }
  return url;
}

function convertSql(sql: string): string {
  let index = 0;
  const original = sql;
  let result = sql
    .replace(/\?/g, () => `$${++index}`)
    .replace(/datetime\('now',\s*'([^']+)'\)/gi, (_, mod) => {
      const m = mod.match(/^([+-]?\d+)\s+(.+)/);
      if (!m) return `CURRENT_TIMESTAMP + INTERVAL '${mod}'`;
      const op = m[1].startsWith('-') ? '-' : '+';
      const val = m[1].replace(/[+-]/, '');
      return `CURRENT_TIMESTAMP ${op} INTERVAL '${val} ${m[2]}'`;
    })
    .replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bdate\('now'\)/gi, "CURRENT_DATE")
    .replace(/MAX\(0,\s*/gi, "GREATEST(0,");

  const isInsertOrIgnore = /\bINSERT OR IGNORE INTO\b/i.test(original);
  const isInsertOrReplace = /\bINSERT OR REPLACE INTO\b/i.test(original);
  const isInsert = /^\s*INSERT\s+INTO\s+/i.test(result);

  result = result.replace(/\bINSERT OR IGNORE INTO\b/gi, "INSERT INTO");
  result = result.replace(/\bINSERT OR REPLACE INTO\b/gi, "INSERT INTO");

  if (isInsertOrReplace && /settings/i.test(original)) {
    result += " ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value";
  } else if (isInsertOrIgnore) {
    result += " ON CONFLICT DO NOTHING";
  } else if (isInsert && !/ON CONFLICT/i.test(result) && !/RETURNING/i.test(result)) {
    result += " RETURNING id";
  }

  return result;
}

type Backend = "pg" | "sqlite";

class Statement {
  private sql: string;
  private db: DbWrapper;
  private ready: Promise<void>;

  constructor(sql: string, db: DbWrapper, ready: Promise<void>) {
    this.sql = sql;
    this.db = db;
    this.ready = ready;
  }

  async run(...params: any[]) {
    await this.ready;
    const client = this.db.getClient();
    if (this.db.sqlite) {
      const result = client.prepare(this.sql).run(...params);
      return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
    }
    const text = convertSql(this.sql);
    const result = await client.query(text, params);
    return {
      changes: result.rowCount ?? 0,
      lastInsertRowid: result.rows?.[0]?.id ?? 0,
    };
  }

  async get(...params: any[]) {
    await this.ready;
    const client = this.db.getClient();
    if (this.db.sqlite) {
      const row = client.prepare(this.sql).get(...params);
      return row ? Object.assign({}, row) : undefined;
    }
    const text = convertSql(this.sql);
    const result = await client.query(text, params);
    const row = result.rows[0] as any;
    return row ? Object.assign({}, row) : undefined;
  }

  async all(...params: any[]) {
    await this.ready;
    const client = this.db.getClient();
    if (this.db.sqlite) {
      const rows = client.prepare(this.sql).all(...params);
      return (rows as any[]).map((r: any) => Object.assign({}, r));
    }
    const text = convertSql(this.sql);
    const result = await client.query(text, params);
    return (result.rows as any[]).map((r: any) => Object.assign({}, r));
  }
}

class DbWrapper {
  private pool: any = null;
  sqlite: any = null;
  private txClient: any = null;
  private ready: Promise<void>;
  private initDone = false;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    this.pool = new Pool({ connectionString: getDbUrl(), ssl: { rejectUnauthorized: false } });
    try {
      await this.pool.query("SELECT 1");
      await this.initSchema("pg");
    } catch {
      await this.pool.end().catch(() => {});
      this.pool = null;
      await this.fallbackToSqlite();
    }
    this.initDone = true;
  }

  private async fallbackToSqlite() {
    const Database = (await import("better-sqlite3")).default;
    this.sqlite = new Database("dev.db");
    this.sqlite.pragma("journal_mode = WAL");
    this.sqlite.pragma("foreign_keys = ON");
    console.log("[db] PostgreSQL unavailable, using SQLite (dev.db)");
    await this.initSchema("sqlite");
  }

  getClient() {
    if (this.sqlite) return this.txClient || this.sqlite;
    return this.txClient || this.pool;
  }

  prepare(sql: string) {
    return new Statement(sql, this, this.ready);
  }

  async exec(sql: string) {
    if (this.sqlite) {
      this.getClient().exec(sql);
      return;
    }
    await this.getClient().query(sql);
  }

  transaction<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => Promise<T> {
    return async (...args: unknown[]) => {
      if (this.sqlite) {
        const bound = fn.bind(null, ...args);
        return this.sqlite.transaction(bound)();
      }
      const client = await this.pool.connect();
      this.txClient = client;
      try {
        await client.query("BEGIN");
        const result = await fn(...args);
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
        this.txClient = null;
      }
    };
  }

  private async initSchema(backend: Backend) {
    const pg = backend === "pg";

    const ddl = `
      CREATE TABLE IF NOT EXISTS suppliers (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT NOT NULL UNIQUE,
        price ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        wholesale_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        quantity INTEGER DEFAULT 0,
        category TEXT,
        min_stock INTEGER DEFAULT 5,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        barcode TEXT,
        image_url TEXT,
        cost_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        selling_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        original_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        unit_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        price_per_case ${pg ? "DOUBLE PRECISION" : "REAL"},
        has_variants INTEGER DEFAULT 0,
        track_batches INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
        quantity INTEGER NOT NULL,
        unit_cost ${pg ? "DOUBLE PRECISION" : "REAL"},
        case_cost ${pg ? "DOUBLE PRECISION" : "REAL"},
        case_quantity INTEGER,
        note TEXT,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS locations (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL UNIQUE,
        address TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        price ${pg ? "DOUBLE PRECISION" : "REAL"},
        quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS batches (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        batch_no TEXT NOT NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        expiry_date TEXT,
        cost_price ${pg ? "DOUBLE PRECISION" : "REAL"},
        received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'stock_manager')) DEFAULT 'cashier',
        pin TEXT,
        permissions TEXT DEFAULT '[]',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        type TEXT NOT NULL CHECK(type IN ('low_stock', 'expiring_batch', 'expired_batch', 'info')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_groups (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL UNIQUE,
        discount_percent ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        markup_percent ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_group_prices (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        group_id INTEGER NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        UNIQUE(group_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS debts (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        type TEXT NOT NULL CHECK(type IN ('customer', 'supplier')),
        reference_id INTEGER NOT NULL,
        amount ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        paid_amount ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')),
        due_date TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS debt_payments (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS physical_audits (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS physical_audit_items (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
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
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        amount ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        description TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed', 'buy_x_get_y')),
        value ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        min_purchase ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        buy_qty INTEGER DEFAULT 0,
        get_qty INTEGER DEFAULT 0,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        start_date TEXT,
        end_date TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS membership_tiers (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL UNIQUE,
        min_spend ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        discount_percent ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        benefits TEXT
      );

      CREATE TABLE IF NOT EXISTS members (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES membership_tiers(id) ON DELETE SET NULL,
        points ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        total_spent ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_orders (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
        total ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        delivery_address TEXT,
        delivery_fee ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_order_items (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        order_id INTEGER NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        price ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        quantity INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_partners (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        phone TEXT,
        commission_type TEXT DEFAULT 'fixed' CHECK(commission_type IN ('fixed', 'percentage')),
        commission_value ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deliveries (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        order_id INTEGER REFERENCES customer_orders(id) ON DELETE SET NULL,
        partner_id INTEGER REFERENCES delivery_partners(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
        fee ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        receipt_data TEXT NOT NULL,
        total ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        item_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        customer_type TEXT NOT NULL CHECK(customer_type IN ('wholesale', 'retail')) DEFAULT 'retail',
        credit ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        total ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        item_count INTEGER NOT NULL,
        customer_type TEXT,
        payment_method TEXT DEFAULT 'cash',
        discount ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        discount_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id ${pg ? "SERIAL" : "INTEGER"} PRIMARY KEY${pg ? "" : " AUTOINCREMENT"},
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        sku TEXT,
        price ${pg ? "DOUBLE PRECISION" : "REAL"} NOT NULL,
        quantity INTEGER NOT NULL,
        discount ${pg ? "DOUBLE PRECISION" : "REAL"} DEFAULT 0,
        discount_type TEXT,
        promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );


    `;

    await this.exec(ddl);

    const upsertSetting = async (key: string, value: string) => {
      if (this.sqlite) {
        await this.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
      } else {
        await this.prepare("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(key, value);
      }
    };

    await upsertSetting("printer_type", "browser");
    await upsertSetting("paper_width", "80");
    await upsertSetting("receipt_header", "=== MY STORE ===");
    await upsertSetting("receipt_footer", "Thank you! Visit again.");
    await upsertSetting("receipt_copies", "1");
    await upsertSetting("auto_print", "0");
    await upsertSetting("store_name", "My Store");
    await upsertSetting("store_address", "");
    await upsertSetting("store_phone", "");
    await upsertSetting("printer_ip", "");
    await upsertSetting("printer_port", "9100");
    await upsertSetting("telegram_notify_low_stock", "1");
    await upsertSetting("telegram_notify_daily", "1");
    await upsertSetting("payment_default_method", "cash");
    await upsertSetting("payment_methods_enabled", "cash,bank_transfer");
    await upsertSetting("tax_rate", "0");
    await upsertSetting("tax_label", "Tax");

    const countSql = pg
      ? "SELECT COUNT(*)::int as count FROM users"
      : "SELECT COUNT(*) as count FROM users";
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPin = process.env.ADMIN_PIN;

    if (!adminEmail || !adminPassword || !adminPin) {
      console.warn("ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PIN must be set in .env to seed admin user");
    }

    const userCount = (await this.prepare(countSql).get() as { count: number }).count;
    if (userCount === 0) {
      if (adminEmail && adminPassword && adminPin) {
        const password_hash = hashPassword(adminPassword);
        await this.prepare(
          pg
            ? "INSERT INTO users (name, email, password_hash, role, pin) VALUES ($1, $2, $3, $4, $5)"
            : "INSERT INTO users (name, email, password_hash, role, pin) VALUES (?, ?, ?, ?, ?)"
        ).run("Administrator", adminEmail, password_hash, "admin", adminPin);
      }
    } else if (adminEmail && adminPassword && adminPin) {
      const password_hash = hashPassword(adminPassword);
      await this.prepare(
        pg
          ? "UPDATE users SET password_hash = $1, pin = $2 WHERE email = $3 AND (password_hash = '' OR password_hash IS NULL)"
          : "UPDATE users SET password_hash = ?, pin = ? WHERE email = ? AND (password_hash = '' OR password_hash IS NULL)"
      ).run(password_hash, adminPin, adminEmail);
    }
  }
}

const db = globalForDb.db ?? new DbWrapper();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export { db };
