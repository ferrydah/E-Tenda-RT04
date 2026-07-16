const express = require('express');
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
