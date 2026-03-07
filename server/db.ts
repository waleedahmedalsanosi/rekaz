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

  await seedData();
}

async function seedData() {
  const result = await client.execute('SELECT COUNT(*) as c FROM users');
  const count = (result.rows[0] as any).c;
  if (count > 0) return;

  const ins = async (sql: string, args: any[]) => {
    await client.execute({ sql, args });
  };

  // Users
  await ins('INSERT INTO users (id,name,phone,email,role) VALUES (?,?,?,?,?)', ['admin-1','المدير','0500000000','admin@zeina.sa','ADMIN']);
  await ins('INSERT INTO users (id,name,phone,email,role,avatar) VALUES (?,?,?,?,?,?)', ['user-p1','ليلى أحمد','0501234567','leila@zeina.sa','PROVIDER','https://picsum.photos/seed/prov1/200/200']);
  await ins('INSERT INTO users (id,name,phone,email,role,avatar) VALUES (?,?,?,?,?,?)', ['user-p2','ريم محمد','0509876543','reem@zeina.sa','PROVIDER','https://picsum.photos/seed/prov2/200/200']);
  await ins('INSERT INTO users (id,name,phone,email,role,avatar) VALUES (?,?,?,?,?,?)', ['user-c1','نورة العتيبي','0555123456','noura@example.sa','CLIENT','https://picsum.photos/seed/cli1/200/200']);
  await ins('INSERT INTO users (id,name,phone,email,role,avatar) VALUES (?,?,?,?,?,?)', ['user-c2','سارة القحطاني','0555234567','sara@example.sa','CLIENT','https://picsum.photos/seed/cli2/200/200']);
  await ins('INSERT INTO users (id,name,phone,email,role,avatar) VALUES (?,?,?,?,?,?)', ['user-c3','هيا محمد','0555345678','haya@example.sa','CLIENT','https://picsum.photos/seed/cli3/200/200']);

  // Providers
  await ins('INSERT INTO providers (id,user_id,specialty,rating,bio,city,covered_neighborhoods,is_verified,subscription_tier,review_count) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ['p1','user-p1','مكياج وعرائس',4.9,'متخصصة في مكياج العرائس والسهرات بخبرة 8 سنوات','الرياض',JSON.stringify(['العليا','الملز','الروضة','النزهة','الربوة']),1,'PRO',48]);
  await ins('INSERT INTO providers (id,user_id,specialty,rating,bio,city,covered_neighborhoods,is_verified,subscription_tier,review_count) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ['p2','user-p2','تصفيف الشعر',4.7,'صالون متكامل للعناية بالشعر وتصفيفه','الرياض',JSON.stringify(['الملز','الروضة','النزهة']),0,'BASIC',31]);

  // Services
  const svcs = [
    ['s1','p1','مكياج سهرة','مكياج احترافي للمناسبات والسهرات',350,60,'مكياج','https://picsum.photos/seed/svc1/400/300',1],
    ['s2','p1','مكياج عروس','مكياج عرائس كامل مع التجربة',1500,180,'مكياج','https://picsum.photos/seed/svc2/400/300',1],
    ['s3','p2','تسريحة ويفي','تسريحة شعر ويفي احترافية',200,45,'شعر','https://picsum.photos/seed/svc3/400/300',1],
    ['s4','p2','صبغة شعر','صبغة شعر كاملة مع العناية',600,150,'شعر','https://picsum.photos/seed/svc4/400/300',1],
  ];
  for (const s of svcs) {
    await ins('INSERT INTO services (id,provider_id,name,description,price,duration,category,image,is_available) VALUES (?,?,?,?,?,?,?,?,?)', s);
  }

  // Bookings
  const bkgs = [
    ['b1','user-c1','s1','p1','2025-01-15','14:00','CONFIRMED','PAID',350,7,357,'العليا',0,1,null,null],
    ['b2','user-c2','s3','p2','2025-01-16','11:00','PENDING','UNPAID',200,4,204,'الملز',0,0,null,null],
    ['b3','user-c1','s2','p1','2024-12-20','10:00','COMPLETED','PAID',1500,30,1530,'الروضة',1,1,'r1',null],
  ];
  for (const b of bkgs) {
    await ins('INSERT INTO bookings (id,customer_id,service_id,provider_id,date,time,status,payment_status,service_price,commission,total_price,neighborhood,client_confirmed,provider_confirmed,review_id,dispute_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', b);
  }

  // Reviews
  await ins('INSERT INTO reviews (id,booking_id,customer_id,provider_id,rating,comment) VALUES (?,?,?,?,?,?)',
    ['r1','b3','user-c1','p1',5,'ليلى ماشاء الله تخصصها عالي جداً، جاء المكياج احترافي وخفيف على البشرة']);

  // Wallets
  await ins('INSERT INTO wallets (id,provider_id,balance,pending_balance,total_earned) VALUES (?,?,?,?,?)', ['w1','p1',1500,357,4200]);
  await ins('INSERT INTO wallets (id,provider_id,balance,pending_balance,total_earned) VALUES (?,?,?,?,?)', ['w2','p2',800,204,2100]);

  // Transactions
  const txns = [
    ['t1','w1','b3','CREDIT',1470,'COMPLETED','حجز #b3 - مكياج عروس'],
    ['t2','w1',null,'PAYOUT',500,'COMPLETED','تحويل إلى الحساب البنكي'],
    ['t3','w1','b1','CREDIT',343,'COMPLETED','حجز #b1 - مكياج سهرة'],
    ['t4','w2','b2','CREDIT',196,'COMPLETED','حجز #b2 - تسريحة ويفي'],
  ];
  for (const t of txns) {
    await ins('INSERT INTO transactions (id,wallet_id,booking_id,type,amount,status,description) VALUES (?,?,?,?,?,?,?)', t);
  }

  // Dispute
  await ins('INSERT INTO disputes (id,booking_id,reason,status,client_id,provider_id) VALUES (?,?,?,?,?,?)',
    ['d1','b2','الخدمة لم تكن كما وصفت','OPEN','user-c2','p2']);

  // Conversation + messages
  await ins('INSERT INTO conversations (id,client_id,provider_id) VALUES (?,?,?)', ['conv1','user-c1','p1']);
  const msgs = [
    ['msg1','conv1','user-c1','CLIENT','السلام عليكم، هل متاحة يوم الجمعة؟',1],
    ['msg2','conv1','user-p1','PROVIDER','وعليكم السلام، نعم متاحة من 10 صباحاً',1],
    ['msg3','conv1','user-c1','CLIENT','ممتاز، سأحجز الآن',1],
    ['msg4','conv1','user-p1','PROVIDER','أهلاً بك، في انتظار حجزك',0],
  ];
  for (const m of msgs) {
    await ins('INSERT INTO messages (id,conversation_id,sender_id,sender_role,content,is_read) VALUES (?,?,?,?,?,?)', m);
  }

  // Payout request
  await ins('INSERT INTO payout_requests (id,provider_id,amount,iban,status) VALUES (?,?,?,?,?)',
    ['pr1','p2',500,'SA0380000000608010167519','PENDING']);

  console.log('✅ Database seeded with initial data');
}

export default db;
