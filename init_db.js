const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  // Tabel Pengguna
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'ketua_tenda', 'anggota'
    nama_lengkap TEXT
  )`);

  // Tabel Peralatan (Katalog & Stok)
  db.run(`CREATE TABLE IF NOT EXISTS peralatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    stok_total INTEGER,
    stok_tersedia INTEGER,
    gambar TEXT,
    harga_sewa_per_hari INTEGER
  )`);

  // Tabel Transaksi Penyewaan
  db.run(`CREATE TABLE IF NOT EXISTS penyewaan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    peralatan_id INTEGER,
    jumlah INTEGER,
    tgl_mulai TEXT,
    tgl_selesai TEXT,
    total_harga INTEGER,
    status TEXT, -- 'pending', 'disetujui', 'ditolak', 'selesai'
    catatan TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(peralatan_id) REFERENCES peralatan(id)
  )`);

  // Akun Contoh
  db.run("INSERT OR IGNORE INTO users (username, password, role, nama_lengkap) VALUES ('admin', 'admin123', 'admin', 'Admin RT 04')");
  db.run("INSERT OR IGNORE INTO users (username, password, role, nama_lengkap) VALUES ('ketua', 'ketua123', 'ketua_tenda', 'Pak Bambang (Ketua Tenda)')");
  db.run("INSERT OR IGNORE INTO users (username, password, role, nama_lengkap) VALUES ('warga1', 'warga123', 'anggota', 'Budi Utomo (Warga No 12)')");

  // Stok Awal Peralatan
  db.run("INSERT OR IGNORE INTO peralatan (nama, stok_total, stok_tersedia, gambar, harga_sewa_per_hari) VALUES ('Tenda Utama 4x6', 2, 2, 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=200', 100000)");
  db.run("INSERT OR IGNORE INTO peralatan (nama, stok_total, stok_tersedia, gambar, harga_sewa_per_hari) VALUES ('Kursi Plastik Napolly', 100, 100, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200', 1500)");
  db.run("INSERT OR IGNORE INTO peralatan (nama, stok_total, stok_tersedia, gambar, harga_sewa_per_hari) VALUES ('Genset 3000 Watt', 1, 1, 'https://images.unsplash.com/photo-1597484211616-39196ef35c28?w=200', 150000)");

  console.log("Database berhasil diinisialisasi.");
});
db.close();
