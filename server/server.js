const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'xolotl_sovereign_secret_key_2026';

// Middleware
app.use(cors({
  origin: '*', // Or restrict to ['https://xolotl.ca', 'https://www.xolotl.ca']
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'Prefer']
}));
app.use(express.json());

// SQLite Database Initialization
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'telemetry.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite sovereign database:', dbPath);
  }
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS beta_signups (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      platform TEXT DEFAULT 'all',
      interest_type TEXT DEFAULT 'individual',
      city TEXT,
      region TEXT,
      country TEXT DEFAULT 'Canada',
      country_code TEXT DEFAULT 'CA',
      latitude REAL,
      longitude REAL,
      detected_timezone TEXT,
      language TEXT DEFAULT 'en',
      notes TEXT,
      node_badge_id TEXT,
      status TEXT DEFAULT 'waitlist',
      ip_address TEXT
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_signups_email ON beta_signups(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_signups_created ON beta_signups(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_signups_loc ON beta_signups(latitude, longitude)`);

  // Seed with initial nodes if table is empty
  db.get('SELECT COUNT(*) as count FROM beta_signups', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Seeding initial node mesh...');
      const stmt = db.prepare(`
        INSERT INTO beta_signups (
          id, created_at, full_name, email, platform, interest_type, city, region, country, country_code, latitude, longitude, node_badge_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      const seedNodes = [
        ['seed-1', now, 'Toronto Enclave 1', 'custodian@xolotl.ca', 'linux_x86', 'developer', 'Toronto', 'Ontario', 'Canada', 'CA', 43.6535, -79.383, 'NODE-CA-0101', 'active'],
        ['seed-2', now, 'Toronto Enclave 2', 'custodian2@xolotl.ca', 'linux_x86', 'developer', 'Toronto', 'Ontario', 'Canada', 'CA', 43.6535, -79.383, 'NODE-CA-0101', 'active'],
        ['seed-3', now, 'Mississauga Enclave', 'mississauga@xolotl.ca', 'macos_arm', 'individual', 'Mississauga', 'Ontario', 'Canada', 'CA', 43.579, -79.658, 'NODE-CA-0102', 'active'],
        ['seed-4', now, 'Winnipeg Sovereign Hub 1', 'winnipeg@xolotl.ca', 'linux_x86', 'developer', 'Winnipeg', 'Manitoba', 'Canada', 'CA', 49.885, -97.147, 'NODE-CA-0100', 'active'],
        ['seed-5', now, 'Winnipeg Sovereign Hub 2', 'winnipeg2@xolotl.ca', 'linux_x86', 'developer', 'Winnipeg', 'Manitoba', 'Canada', 'CA', 49.885, -97.147, 'NODE-CA-0100', 'active'],
        ['seed-6', now, 'Quebec Shield Node', 'stfelix@xolotl.ca', 'linux_arm', 'individual', 'Saint-Felix-de-Valois', 'Quebec', 'Canada', 'CA', 46.17, -73.425, 'NODE-CA-0103', 'active']
      ];

      seedNodes.forEach(node => stmt.run(node));
      stmt.finalize();
      console.log('Seeded 6 initial nodes.');
    }
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Xolotl Sovereign Telemetry API',
    jurisdiction: 'Canadian Sovereign Custody',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 1. PostgREST-compatible POST /rest/v1/beta_signups
app.post('/rest/v1/beta_signups', (req, res) => {
  const body = Array.isArray(req.body) ? req.body[0] : req.body;
  if (!body || !body.email) {
    return res.status(400).json({ error: 'Missing required field: email' });
  }

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  const query = `
    INSERT INTO beta_signups (
      id, created_at, full_name, email, platform, interest_type,
      city, region, country, country_code, latitude, longitude,
      detected_timezone, language, notes, node_badge_id, status, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    created_at,
    body.full_name || 'Anonymous Sovereign',
    body.email,
    body.platform || 'all',
    body.interest_type || 'individual',
    body.city || null,
    body.region || null,
    body.country || 'Canada',
    body.country_code || 'CA',
    body.latitude ? Number(body.latitude) : null,
    body.longitude ? Number(body.longitude) : null,
    body.detected_timezone || null,
    body.language || 'en',
    body.notes || null,
    body.node_badge_id || ('NODE-CA-' + Math.floor(1000 + Math.random() * 9000)),
    body.status || 'waitlist',
    ip
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ error: 'Database write failure' });
    }
    console.log(`[SIGNUP] ${body.full_name} (${body.email}) enlisted from ${body.city || 'Unknown'}`);
    res.status(201).json([{ id, created_at, status: 'enlisted' }]);
  });
});

// 2. PostgREST-compatible GET /rest/v1/beta_nodes_geographic_distribution
app.get('/rest/v1/beta_nodes_geographic_distribution', (req, res) => {
  const sql = `
    SELECT 
      COALESCE(city, 'Regional Cluster') AS city,
      COALESCE(region, '') AS region,
      COALESCE(country, 'Canada') AS country,
      COALESCE(country_code, 'CA') AS country_code,
      COUNT(*) AS total_nodes,
      ROUND(AVG(latitude), 4) AS avg_latitude,
      ROUND(AVG(longitude), 4) AS avg_longitude,
      MAX(created_at) AS latest_node_enlisted
    FROM beta_signups
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY country, country_code, region, city
    ORDER BY total_nodes DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: 'Database read failure' });
    }
    res.json(rows);
  });
});

// Fallback RPC endpoint
app.post('/rest/v1/rpc/get_live_node_clusters', (req, res) => {
  const sql = `
    SELECT 
      COALESCE(city, 'Regional Cluster') AS city,
      COALESCE(region, '') AS region,
      COALESCE(country, 'Canada') AS country,
      COALESCE(country_code, 'CA') AS country_code,
      COUNT(*) AS total_nodes,
      ROUND(AVG(latitude), 4) AS avg_latitude,
      ROUND(AVG(longitude), 4) AS avg_longitude,
      MAX(created_at) AS latest_node_enlisted
    FROM beta_signups
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY country, country_code, region, city
    ORDER BY total_nodes DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: 'Database read failure' });
    }
    res.json(rows);
  });
});

// 3. Admin CSV Export (Protected by token)
app.get('/admin/export.csv', (req, res) => {
  const token = req.query.token || req.headers['authorization'];
  if (token !== ADMIN_TOKEN && token !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).send('Unauthorized. Provide ?token=YOUR_ADMIN_TOKEN');
  }

  db.all('SELECT * FROM beta_signups ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');

    const headers = ['id', 'created_at', 'full_name', 'email', 'platform', 'interest_type', 'city', 'region', 'country', 'latitude', 'longitude', 'node_badge_id', 'status', 'notes'];
    let csv = headers.join(',') + '\n';

    rows.forEach(r => {
      const line = headers.map(h => {
        const val = (r[h] === null || r[h] === undefined) ? '' : String(r[h]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
      csv += line + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="xolotl_signups_${Date.now()}.csv"');
    res.send(csv);
  });
});

// 4. Admin HTML Dashboard (Protected by token)
app.get('/admin/signups', (req, res) => {
  const token = req.query.token || req.headers['authorization'];
  if (token !== ADMIN_TOKEN && token !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).send('<h3>Unauthorized</h3><p>Provide valid ?token=YOUR_ADMIN_TOKEN</p>');
  }

  db.all('SELECT * FROM beta_signups ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Xolotl Sovereign Enclave Signups</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0b110e; color: #f8fafc; padding: 24px; margin: 0; }
          h2 { color: #10b981; margin-top: 0; }
          .bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .btn { background: #10b981; color: #0b110e; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; background: #141c18; border-radius: 8px; overflow: hidden; font-size: 0.85rem; }
          th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
          th { background: #1a2520; color: #94a3b8; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.05em; }
          tr:hover { background: rgba(16,185,129,0.05); }
          .badge { background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="bar">
          <div>
            <h2>Xolotl Canadian Shield // Sovereign Signups</h2>
            <div style="color: #94a3b8; font-size: 0.9rem;">Total Enlisted Operators: <strong>${rows.length}</strong></div>
          </div>
          <a href="/admin/export.csv?token=${encodeURIComponent(token)}" class="btn">⬇ Export CSV</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>Operator</th>
              <th>Email</th>
              <th>Location</th>
              <th>Node Badge</th>
              <th>Focus</th>
              <th>Platform</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${new Date(r.created_at).toLocaleString()}</td>
                <td><strong>${r.full_name}</strong></td>
                <td><a href="mailto:${r.email}" style="color: #6ee7b7; text-decoration: none;">${r.email}</a></td>
                <td>${[r.city, r.region, r.country_code].filter(Boolean).join(', ') || '—'}</td>
                <td><span class="badge">${r.node_badge_id || 'NODE-CA'}</span></td>
                <td>${r.interest_type || '—'}</td>
                <td>${r.platform || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    res.send(html);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`Xolotl Sovereign Telemetry API running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Admin Token: ${ADMIN_TOKEN}`);
  console.log(`===================================================`);
});
