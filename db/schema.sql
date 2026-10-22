CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, ip_hash TEXT, first TEXT, last TEXT, dealership TEXT, website TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT, source_page TEXT, ai_reply TEXT, reply_source TEXT, autoreply_sent INTEGER, notify_status TEXT, autoreply_status TEXT, is_test INTEGER);
CREATE INDEX IF NOT EXISTS leads_ip_time ON leads(ip_hash, created_at);
-- chat widget (2026-10-21)
ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'contact';
ALTER TABLE leads ADD COLUMN transcript TEXT;
CREATE TABLE IF NOT EXISTS chat_hits (ip_hash TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS chat_hits_ip_time ON chat_hits(ip_hash, created_at);
