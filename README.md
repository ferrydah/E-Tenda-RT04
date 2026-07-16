# E-Tenda-RT04
Sistem Informasi Penyelenggaraan &amp; Penyewaan Peralatan RT 04
Alur Kerja & Mekanisme Approval Ketua TendaUntuk memastikan proses penyewaan tertib, sistem ini menggunakan alur persetujuan (approval) berjenjang:[Anggota] Isi Form Sewa ➔ [Sistem] Status "Menunggu Approval" & Stok Dikunci Sementara 
➔ [Ketua Tenda] Klik "Approve" atau "Reject" 
➔ [Sistem] Jika Approve: Status "Disetujui", Stok Berkurang, Struk/Kwitansi Terbit 
➔ [Sistem] Jika Reject: Status "Ditolak", Stok Kembali Normal
Arsitektur Teknologi (Full-Stack)Agar aplikasi ini ringan, mudah dideploy, dan cepat dibuat, kita akan menggunakan Node.js (Express) untuk Backend dan Tailwind CSS + HTML/EJS untuk Frontend (Monolitik agar tidak pusing mengurus dua server terpisah).Backend: Node.js, Express.jsDatabase: SQLite (Sangat praktis, tidak perlu install server database terpisah, berupa file .db saja)Frontend: Tailwind CSS (via CDN), Flowbite (untuk komponen UI cepat)

Struktur Folder ProyekPlaintext
E-TendaRT04/
├── database.db          # Database SQLite
├── init_db.js           # Script inisialisasi database
├── server.js            # Entry point backend
├── package.json         # Dependensi Node.js
└── views/               # Folder Template Tampilan
    ├── login.ejs        # Halaman Masuk
    ├── katalog.ejs      # Dashboard Anggota + Form Sewa
    ├── admin.ejs        # Dashboard Admin & Ketua Tenda (Approval)
    └── struk.ejs        # Kwitansi / Struk Penyewaan (Siap Cetak/PDF)

Implementasi Kode Full-Stack1. 


File Konfigurasi (package.json)JSON{
  "name": "siperat04",
  "version": "1.0.0",
  "description": "Sistem Penyewaan Alat RT 04",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "init": "node init_db.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "sqlite3": "^5.1.7",
    "ejs": "^3.1.10"
  }
}

2. Inisialisasi Database (init_db.js)
Jalankan perintah npm run init sekali untuk membuat tabel database dan akun sampel.

JavaScript
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
3. Server Utama (server.js)JavaScriptconst express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'rahasia-rt-04',
  resave: false,
  saveUninitialized: true
}));
app.set('view engine', 'ejs');

// Middleware Cek Login
function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/login');
}

// ROUTE: Login
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (user) {
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.nama = user.nama_lengkap;
      if (user.role === 'anggota') return res.redirect('/katalog');
      res.redirect('/admin');
    } else {
      res.render('login', { error: 'Username atau Password salah!' });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ROUTE: Katalog & Form Sewa (Dashboard Anggota)
app.get('/katalog', requireAuth, (req, res) => {
  if (req.session.role !== 'anggota') return res.redirect('/admin');
  
  db.all("SELECT * FROM peralatan", [], (err, alat) => {
    db.all("SELECT p.*, alt.nama as nama_alat FROM penyewaan p JOIN peralatan alt ON p.peralatan_id = alt.id WHERE p.user_id = ?", [req.session.userId], (err, riwayat) => {
      res.render('katalog', { user: req.session, peralatan: alat, riwayat: riwayat });
    });
  });
});

app.post('/sewa', requireAuth, (req, res) => {
  const { peralatan_id, jumlah, tgl_mulai, tgl_selesai } = req.body;
  
  db.get("SELECT * FROM peralatan WHERE id = ?", [peralatan_id], (err, alat) => {
    if (alat && alat.stok_tersedia >= jumlah) {
      const hari = Math.ceil((new Date(tgl_selesai) - new Date(tgl_mulai)) / (1000 * 60 * 60 * 24)) || 1;
      const total = alat.harga_sewa_per_hari * jumlah * hari;

      db.run("INSERT INTO penyewaan (user_id, peralatan_id, jumlah, tgl_mulai, tgl_selesai, total_harga, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
        [req.session.userId, peralatan_id, jumlah, tgl_mulai, tgl_selesai, total], function(err) {
          // Kurangi stok sementara sewaktu status 'pending' agar tidak overbook
          db.run("UPDATE peralatan SET stok_tersedia = stok_tersedia - ? WHERE id = ?", [jumlah, peralatan_id], () => {
            res.redirect('/katalog');
          });
        }
      );
    } else {
      res.send("Stok tidak mencukupi atau alat tidak ditemukan!");
    }
  });
});

// ROUTE: Dashboard Admin & Ketua Tenda (Approval)
app.get('/admin', requireAuth, (req, res) => {
  if (req.session.role === 'anggota') return res.redirect('/katalog');

  db.all("SELECT p.*, u.nama_lengkap, alt.nama as nama_alat FROM penyewaan p JOIN users u ON p.user_id = u.id JOIN peralatan alt ON p.peralatan_id = alt.id", [], (err, sewaList) => {
    db.all("SELECT * FROM peralatan", [], (err, alatList) => {
      res.render('admin', { user: req.session, sewaList: sewaList, peralatan: alatList });
    });
  });
});

// ROUTE: Action Approval (Hanya untuk Ketua Tenda / Admin)
app.post('/approval/:id', requireAuth, (req, res) => {
  const { action } = req.body; // 'approve' atau 'reject'
  const sewaId = req.params.id;

  db.get("SELECT * FROM penyewaan WHERE id = ?", [sewaId], (err, sewa) => {
    if (!sewa) return res.send("Data tidak ditemukan");

    if (action === 'approve') {
      db.run("UPDATE penyewaan SET status = 'disetujui' WHERE id = ?", [sewaId], () => {
        res.redirect('/admin');
      });
    } else if (action === 'reject') {
      // Jika direject, kembalikan stok alat
      db.run("UPDATE penyewaan SET status = 'ditolak' WHERE id = ?", [sewaId], () => {
        db.run("UPDATE peralatan SET stok_tersedia = stok_tersedia + ? WHERE id = ?", [sewa.jumlah, sewa.peralatan_id], () => {
          res.redirect('/admin');
        });
      });
    }
  });
});

// ROUTE: Cetak Struk
app.get('/struk/:id', requireAuth, (req, res) => {
  const sewaId = req.params.id;
  db.get(`
    SELECT p.*, u.nama_lengkap, alt.nama as nama_alat, alt.harga_sewa_per_hari 
    FROM penyewaan p 
    JOIN users u ON p.user_id = u.id 
    JOIN peralatan alt ON p.peralatan_id = alt.id 
    WHERE p.id = ?`, [sewaId], (err, data) => {
      if (data) {
        res.render('struk', { data: data });
      } else {
        res.send("Struk tidak ditemukan!");
      }
  });
});

app.listen(3000, () => console.log('Aplikasi SIPERAT 04 berjalan di http://localhost:3000'));
Contoh Tampilan (Template EJS)Berikut contoh kode untuk salah satu halaman krusial, yaitu Dashboard Admin & Ketua Tenda (views/admin.ejs):HTML<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Dashboard Admin - SIPERAT 04</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
  <div class="max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">Panel Control SIPERAT 04</h1>
        <p class="text-gray-600">Selamat datang, <strong><%= user.nama %></strong> (<%= user.role %>)</p>
      </div>
      <a href="/logout" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Keluar</a>
    </div>

    <!-- Monitoring Stok -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 class="text-xl font-semibold mb-4 text-gray-700">Stok Inventaris Real-Time</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <% peralatan.forEach(alat => { %>
          <div class="border p-4 rounded-lg bg-gray-50">
            <h3 class="font-bold text-lg text-gray-800"><%= alat.nama %></h3>
            <p class="text-sm text-gray-600">Sewa: Rp <%= alat.harga_sewa_per_hari.toLocaleString() %>/hari</p>
            <div class="mt-2 text-sm flex justify-between">
              <span>Stok Tersedia: <strong class="text-green-600"><%= alat.stok_tersedia %></strong></span>
              <span>Total: <%= alat.stok_total %></span>
            </div>
          </div>
        <% }) %>
      </div>
    </div>

    <!-- Daftar Pengajuan Sewa & Approval -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold mb-4 text-gray-700">Daftar Pengajuan Penyewaan</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-200">
              <th class="p-3">Nama Warga</th>
              <th class="p-3">Alat</th>
              <th class="p-3">Qty</th>
              <th class="p-3">Tgl Sewa</th>
              <th class="p-3">Total Biaya</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <% sewaList.forEach(sewa => { %>
              <tr class="border-b">
                <td class="p-3 font-semibold"><%= sewa.nama_lengkap %></td>
                <td class="p-3"><%= sewa.nama_alat %></td>
                <td class="p-3"><%= sewa.jumlah %> pcs</td>
                <td class="p-3"><%= sewa.tgl_mulai %> s/d <%= sewa.tgl_selesai %></td>
                <td class="p-3 font-semibold">Rp <%= sewa.total_harga.toLocaleString() %></td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs font-bold 
                    <%= sewa.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : '' %>
                    <%= sewa.status === 'disetujui' ? 'bg-green-200 text-green-800' : '' %>
                    <%= sewa.status === 'ditolak' ? 'bg-red-200 text-red-800' : '' %>">
                    <%= sewa.status.toUpperCase() %>
                  </span>
                </td>
                <td class="p-3 text-center">
                  <% if (sewa.status === 'pending') { %>
                    <form action="/approval/<%= sewa.id %>" method="POST" class="inline-block gap-2">
                      <button type="submit" name="action" value="approve" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 mr-1">Setujui</button>
                      <button type="submit" name="action" value="reject" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Tolak</button>
                    </form>
                  <% } else if (sewa.status === 'disetujui') { %>
                    <a href="/struk/<%= sewa.id %>" target="_blank" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Cetak Struk</a>
                  <% } else { %>
                    <span class="text-gray-400">-</span>
                  <% } %>
                </td>
              </tr>
            <% }) %>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
Panduan Menjalankan Aplikasi1.Persiapkan Folder:Pastikan Node.js terinstall.Buat folder baru (misal: siperat04), masuk ke folder tersebut, lalu buat file-file di atas (server.js, init_db.js, package.json, dan views).2.Install Dependensi:Waktu: ~1 menit.Jalankan perintah berikut di terminal komputer Anda untuk memasang framework Express dan SQLite3:Bashnpm install
3.Inisialisasi Database:Wajib dijalankan pertama kali.Buat database lokal beserta contoh data alat dengan menjalankan perintah ini:Bashnpm run init
4.Jalankan Server:Aplikasi aktif.Mulai jalankan web server di lokal Anda:Bashnpm start
Buka peramban (browser) Anda dan akses alamat http://localhost:3000/login.Akses Akun Pengujian:Anggota/Warga: Username: warga1 | Password: warga123 (Bisa isi formulir sewa)Ketua Tenda (Pemberi Approval): Username: ketua | Password: ketua123 (Bisa klik setujui/tolak)
