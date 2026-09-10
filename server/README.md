# Xolotl Sovereign Telemetry & Beta Signups API (Self-Hosted on Ubuntu)

This lightweight, zero-dependency Node.js service replaces Supabase's hosted free-tier with 100% sovereign Canadian infrastructure on your own Ubuntu cloud server.

### Key Highlights
- **100% API-Compatible with Supabase**: Implements the exact same `POST /rest/v1/beta_signups` and `GET /rest/v1/beta_nodes_geographic_distribution` endpoints.
- **Zero Frontend Refactoring**: Just point `XOLOTL_SUPABASE.url` in `assets/js/main.js` to your new server domain.
- **Ultra-Lightweight SQLite**: Runs in ~35MB RAM, uses zero CPU when idle. No complex PostgreSQL pooler to crash or pause.
- **Built-in Admin Dashboard**: Browse signups at `https://api.xolotl.ca/admin/signups?token=YOUR_TOKEN` or export CSV at `https://api.xolotl.ca/admin/export.csv?token=YOUR_TOKEN`.

---

## 5-Minute Setup Guide for Ubuntu Server

### 1. Install Node.js on Ubuntu
```bash
sudo apt update && sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Copy/Deploy Files to Server
```bash
sudo mkdir -p /var/www/xolotl-api
sudo chown -R $USER:$USER /var/www/xolotl-api

# Copy server files into /var/www/xolotl-api
cd /var/www/xolotl-api
npm install
```

### 3. Setup Systemd Service (Auto-restart & 24/7 Uptime)
```bash
sudo cp /var/www/xolotl-api/xolotl-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable xolotl-api
sudo systemctl start xolotl-api
sudo systemctl status xolotl-api
```

### 4. Setup Nginx & Free Let's Encrypt SSL
1. Point an **A record** in your DNS:
   - **Host**: `api` (e.g. `api.xolotl.ca`)
   - **Target**: `YOUR_UBUNTU_SERVER_IP`
2. Configure Nginx:
```bash
sudo cp /var/www/xolotl-api/nginx.conf /etc/nginx/sites-available/api.xolotl.ca
sudo ln -s /etc/nginx/sites-available/api.xolotl.ca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
3. Enable free automatic HTTPS with Certbot:
```bash
sudo certbot --nginx -d api.xolotl.ca
```

### 5. Update main.js on Frontend
In `assets/js/main.js`, change:
```javascript
const XOLOTL_SUPABASE = {
  url: 'https://api.xolotl.ca',
  anonKey: 'sovereign-mesh',
  tableName: 'beta_signups'
};
```
Commit and push to GitHub Pages. You are now 100% self-hosted!
