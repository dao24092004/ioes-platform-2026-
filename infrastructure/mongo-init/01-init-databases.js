// ============================================
// IOES - MongoDB Initialization Script
// Runs once at first container start (after MongoDB initdb).
// Creates per-service databases and users; never connects as root from app code.
// ============================================

const dbName = process.env.MONGO_DB_NAME_PREFIX || 'ioes';
const rootUser = process.env.MONGO_INITDB_ROOT_USERNAME;
const rootPass = process.env.MONGO_INITDB_ROOT_PASSWORD;

if (!rootUser || !rootPass) {
    print('ERROR: MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD must be set');
    quit(1);
}

// Authenticate as root to manage users.
const adminDb = db.getSiblingDB('admin');
adminDb.auth(rootUser, rootPass);

// --------------------------------------------
// Per-service users + databases
// Each service gets its own user with permissions limited to its DB.
// Pattern: <service>_user → <db_name>
// --------------------------------------------

const services = [
    {
        db: `${dbName}_content`,
        user: `${dbName}_content_user`,
        // Default password for local dev — override via env in production.
        pass: process.env.MONGO_CONTENT_PASSWORD || 'ioes_content_dev_password',
        collections: ['courses', 'lessons', 'media', 'categories', 'tags', 'reviews'],
        indexes: [
            { coll: 'courses',   keys: { 'slug': 1 },            unique: true },
            { coll: 'courses',   keys: { 'status': 1 } },
            { coll: 'courses',   keys: { 'instructorId': 1 } },
            { coll: 'lessons',   keys: { 'courseId': 1, 'order': 1 } },
            { coll: 'media',     keys: { 'uploadedAt': -1 } },
            { coll: 'categories', keys: { 'parentId': 1 } },
        ],
    },
    {
        db: `${dbName}_analytics`,
        user: `${dbName}_analytics_user`,
        pass: process.env.MONGO_ANALYTICS_PASSWORD || 'ioes_analytics_dev_password',
        collections: ['events', 'sessions', 'aggregations', 'reports'],
        indexes: [
            { coll: 'events',        keys: { 'userId': 1, 'timestamp': -1 } },
            { coll: 'events',        keys: { 'type': 1 } },
            { coll: 'events',        keys: { 'timestamp': -1 } },
            { coll: 'sessions',      keys: { 'userId': 1 }, unique: true },
            { coll: 'aggregations',  keys: { 'metric': 1, 'window': 1 }, unique: true },
        ],
    },
];

for (const svc of services) {
    print(`\n--- Setting up ${svc.db} ---`);
    const target = db.getSiblingDB(svc.db);

    // Idempotent user creation: drop + recreate ensures passwords match env.
    try {
        adminDb.dropUser(svc.user);
        print(`  Dropped existing user ${svc.user}`);
    } catch (e) {
        // user didn't exist yet — fine
    }
    adminDb.createUser({
        user: svc.user,
        pwd: svc.pass,
        roles: [{ role: 'readWrite', db: svc.db }],
    });
    print(`  ✓ Created user ${svc.user} (readWrite on ${svc.db})`);

    // Create collections explicitly (so they show up in mongo-express).
    for (const coll of svc.collections) {
        target.createCollection(coll);
    }
    print(`  ✓ Created ${svc.collections.length} collections`);

    // Create indexes.
    for (const idx of svc.indexes) {
        target.getCollection(idx.coll).createIndex(idx.keys, { unique: !!idx.unique });
    }
    print(`  ✓ Created ${svc.indexes.length} indexes`);
}

print('\n✓ MongoDB initialization complete.');