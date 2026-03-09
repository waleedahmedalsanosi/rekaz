import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL || 'file:zeina.db',
  authToken: process.env.TURSO_TOKEN || undefined,
});

// Async wrapper that mimics better-sqlite3 prepare().get/all/run API
const db = {
  prepare: (sql: string) => ({
    get: async (...args: any[]) => {
      const r = await client.execute({ sql, args });
      return (r.rows[0] as any) ?? null;
    },
    all: async (...args: any[]) => {
      const r = await client.execute({ sql, args });
      return r.rows as any[];
    },
    run: async (...args: any[]) => {
      await client.execute({ sql, args });
    },
  }),
};

export async function initDB() {
  // Create tables one by one (Turso requires individual statements)
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'PROVIDER', 'CLIENT')),
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      phone TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      specialty TEXT DEFAULT '',
      rating REAL DEFAULT 0,
      bio TEXT DEFAULT '',
      city TEXT DEFAULT '',
      covered_neighborhoods TEXT DEFAULT '[]',
      is_verified INTEGER DEFAULT 0,
      subscription_tier TEXT DEFAULT 'FREE',
      review_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      duration INTEGER NOT NULL,
      category TEXT DEFAULT '',
      image TEXT,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      payment_status TEXT DEFAULT 'UNPAID',
      service_price REAL NOT NULL,
      commission REAL NOT NULL,
      total_price REAL NOT NULL,
      neighborhood TEXT DEFAULT '',
      client_confirmed INTEGER DEFAULT 0,
      provider_confirmed INTEGER DEFAULT 0,
      review_id TEXT,
      dispute_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0,
      pending_balance REAL DEFAULT 0,
      total_earned REAL DEFAULT 0,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      booking_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('CREDIT', 'DEBIT', 'PAYOUT')),
      amount REAL NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    )`,
    `CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      resolution TEXT,
      client_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(client_id, provider_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('CLIENT', 'PROVIDER')),
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`,
    `CREATE TABLE IF NOT EXISTS payout_requests (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      amount REAL NOT NULL,
      iban TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
  ];

  for (const sql of tables) {
    await client.execute(sql);
  }

  // Indexes — safe to re-run (CREATE INDEX IF NOT EXISTS)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id)',
  ];
  for (const sql of indexes) {
    await client.execute(sql);
  }

  // Additive migrations — safe to re-run; errors mean column already exists
  try { await client.execute('ALTER TABLE providers ADD COLUMN working_hours TEXT DEFAULT NULL'); } catch { /* exists */ }
  try { await client.execute('ALTER TABLE bookings ADD COLUMN moyasar_payment_id TEXT DEFAULT NULL'); } catch { /* exists */ }

  await seedData();
}

async function seedData() {
  const result = await client.execute('SELECT COUNT(*) as c FROM users');
  const count = (result.rows[0] as any).c;
  if (count > 0) return;

  const ins = async (sql: string, args: any[]) => {
    await client.execute({ sql, args });
  };

  // Admin user: Amani
  await ins('INSERT INTO users (id,name,phone,role) VALUES (?,?,?,?)', ['admin-1','أماني','+966555123456','ADMIN']);

  // Client user: Lyla
  await ins('INSERT INTO users (id,name,phone,role) VALUES (?,?,?,?)', ['client-lyla','ليلى','+966582314923','CLIENT']);

  // Provider user: Manal
  await ins('INSERT INTO users (id,name,phone,role) VALUES (?,?,?,?)', ['provider-manal','منال','+966505467269','PROVIDER']);

  // Create provider profile for Manal
  await ins('INSERT INTO providers (id,user_id,specialty,rating,bio,city,is_verified) VALUES (?,?,?,?,?,?,?)',
    ['p-manal','provider-manal','مكياج وتصفيف شعر',4.8,'متخصصة في المكياج والتصفيف بتقنيات حديثة','الرياض',1]);

  // Create wallet for provider
  await ins('INSERT INTO wallets (id,user_id,balance,commission_withheld) VALUES (?,?,?,?)',
    ['w-manal','provider-manal',0,0]);

  console.log('✅ Database seeded with test accounts (Admin: Amani, Client: Lyla, Provider: Manal)');
}

export default db;
