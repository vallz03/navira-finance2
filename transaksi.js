// =======================
// FIREBASE CONFIG
// =======================
const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "PROJECT_ID.firebaseapp.com",
  databaseURL: "https://navira-finance-default-rtdb.firebaseio.com/",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =======================
// CEK LOGIN
// =======================
const currentUser = localStorage.getItem("loginUser");

if (!currentUser) {
  alert("Silakan login terlebih dahulu");
  window.location.href = "login.html"; // ubah jika perlu
}

let modeEdit = false;
let editId = null;

// =======================
// SIMPAN / UPDATE LIMIT ANGGARAN
// =======================
function limitanggaran() {
  const limit = document.getElementById("limitanggaran").value;

  if (!limit || limit <= 0) {
    alert("Limit anggaran wajib diisi dengan benar");
    return;
  }

  db.ref("users/" + currentUser).update({
    limitAnggaran: Number(limit),
    limitUpdatedAt: new Date().toISOString()
  })
  .then(() => {
    document.getElementById("infoLimit").innerText =
      "Limit Anggaran Aktif: Rp " + formatRupiah(limit);

    alert("Limit anggaran berhasil disimpan");
  })
  .catch(err => {
    console.error(err);
    alert("Gagal menyimpan limit anggaran");
  });
}

// =======================
// SIMPAN TRANSAKSI
// =======================
function simpan() {
  const jenis = document.getElementById("jenis").value;
  const tanggal = document.getElementById("tanggal").value;
  const metode = document.getElementById("metode").value.trim();
  const kategori = document.getElementById("kategori").value.trim();
  const desk = document.getElementById("desk").value.trim();
  const nominal = document.getElementById("nominal").value;

  if (!jenis || !tanggal || !metode || !kategori || !desk || !nominal) {
    alert("Semua Data wajib diisi");
    return;
  }

  const data = {
    jenis,
    tanggal,
    metode,
    kategori,
    deskripsi: desk,
    nominal: Number(nominal),
    updatedAt: new Date().toISOString()
  };

  // ===== MODE EDIT =====
  if (modeEdit && editId) {
    db.ref("Transaksi/" + currentUser + "/" + editId)
      .update(data)
      .then(() => {
        alert("Transaksi berhasil diperbarui");
        window.location.href = "filter.html";
      })
      .catch(err => {
        console.error(err);
        alert("Gagal update transaksi");
      });
    return;
  }

  // ===== TAMBAH BARU =====
  data.createdAt = new Date().toISOString();

  db.ref("Transaksi/" + currentUser)
    .push(data)
    .then(() => {
      alert("Transaksi berhasil disimpan");
      reset();
    })
    .catch(err => {
      console.error(err);
      alert("Gagal menyimpan transaksi");
    });
}

// =======================
// RESET FORM
// =======================
function reset() {
  document.getElementById("jenis").value = "";
  document.getElementById("tanggal").value = "";
  document.getElementById("metode").value = "";
  document.getElementById("kategori").value = "";
  document.getElementById("desk").value = "";
  document.getElementById("nominal").value = "";
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID").format(angka);
}

// =======================
// LOAD LIMIT SAAT HALAMAN DIBUKA
// =======================
window.onload = () => {

  // ===== LOAD LIMIT =====
  db.ref("users/" + currentUser + "/limitAnggaran")
    .on("value", snapshot => {
      if (snapshot.exists()) {
        const limit = snapshot.val();
        document.getElementById("limitanggaran").value = limit;
        document.getElementById("infoLimit").innerText =
          "Limit Anggaran Aktif: Rp " + formatRupiah(limit);
      } else {
        document.getElementById("infoLimit").innerText =
          "Limit Anggaran belum ditentukan";
      }
    });

  // ===== CEK MODE EDIT =====
  const params = new URLSearchParams(window.location.search);
  if (params.has("edit")) {
    editId = params.get("edit");
    modeEdit = true;

    db.ref("Transaksi/" + currentUser + "/" + editId)
      .once("value")
      .then(snapshot => {
        if (!snapshot.exists()) {
          alert("Data transaksi tidak ditemukan");
          return;
        }

        const d = snapshot.val();

        // isi form otomatis
        document.getElementById("jenis").value = d.jenis;
        document.getElementById("tanggal").value = d.tanggal;
        document.getElementById("metode").value = d.metode;
        document.getElementById("kategori").value = d.kategori;
        document.getElementById("desk").value = d.deskripsi;
        document.getElementById("nominal").value = d.nominal;

        // opsional: ubah teks tombol
        const btn = document.getElementById("btnSimpan");
        if (btn) btn.innerText = "Update Transaksi";
      });
  }
};
