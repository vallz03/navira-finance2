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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// =======================
// CEK LOGIN
// =======================
const currentUser = localStorage.getItem("loginUser");
if (!currentUser) {
  alert("Silakan login terlebih dahulu");
  window.location.href = "login.html";
}

// =======================
// MODE EDIT
// =======================
let modeEdit = false;
let editId = null;

// =======================
// LOAD RIWAYAT TRANSAKSI
// =======================
function loadRiwayat() {
  const container = document.getElementById("riwayatTransaksi");
  if (!container) return;

  container.innerHTML = "<p>Memuat data...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>Belum ada transaksi</p>";
      return;
    }

    snapshot.forEach(child => {
      renderItem(container, child.key, child.val());
    });
  });
}

// =======================
// FILTER TRANSAKSI
// =======================
function terapkan() {
  const jenis = document.getElementById("filterjenis").value;
  const metode = document.getElementById("filterMetode").value.trim().toLowerCase();
  const kategori = document.getElementById("filterKategori").value.trim().toLowerCase();
  const tanggalAwal = document.getElementById("tanggalawal").value;
  const tanggalAkhir = document.getElementById("tanggalakhir").value;
  const container = document.getElementById("riwayatTransaksi");

  if (!jenis) {
    alert("Jenis transaksi wajib dipilih");
    return;
  }

  let awal = tanggalAwal ? new Date(tanggalAwal).setHours(0,0,0,0) : null;
  let akhir = tanggalAkhir ? new Date(tanggalAkhir).setHours(23,59,59,999) : null;

  if (awal && akhir && awal > akhir) {
    alert("Tanggal tidak valid");
    return;
  }

  container.innerHTML = "<p>Memuat data...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";
    let ditemukan = false;

    snapshot.forEach(child => {
      const d = child.val();
      const tgl = new Date(d.tanggal).getTime();

      const metodeDB = (d.metode || "").toLowerCase();
      const kategoriDB = (d.kategori || "").toLowerCase();

      if (d.jenis !== jenis) return;
      if (metode && !metodeDB.includes(metode)) return;
      if (kategori && !kategoriDB.includes(kategori)) return;
      if (awal && tgl < awal) return;
      if (akhir && tgl > akhir) return;

      ditemukan = true;
      renderItem(container, child.key, d);
    });

    if (!ditemukan) {
      container.innerHTML = "<p>Data tidak ditemukan</p>";
    }
  });
}

// =======================
// RENDER ITEM TRANSAKSI
// =======================
function renderItem(container, id, d) {
  const div = document.createElement("div");
  div.className = "card-transaksi";

  div.innerHTML = `
    <b>${d.jenis}</b> | ${d.tanggal}<br>
    ${d.kategori} - ${d.metode}<br>
    ${d.deskripsi}<br>
    <b>Rp ${Number(d.nominal).toLocaleString("id-ID")}</b><br>
    <button onclick="editTransaksi('${id}')">Edit</button>
    <button onclick="hapusTransaksi('${id}')">Hapus</button>
  `;

  container.appendChild(div);
}

// =======================
// EDIT & HAPUS
// =======================
function editTransaksi(id) {
  window.location.href = `transaksi.html?edit=${id}`;
}

function hapusTransaksi(id) {
  if (!confirm("Yakin hapus transaksi ini?")) return;

  db.ref(`Transaksi/${currentUser}/${id}`).remove().then(() => {
    alert("Transaksi dihapus");
    loadRiwayat();
  });
}

// =======================
// SIMPAN / UPDATE TRANSAKSI
// =======================
function simpan() {
  const data = {
    jenis: document.getElementById("jenis").value,
    tanggal: document.getElementById("tanggal").value,
    metode: document.getElementById("metode").value.trim(),
    kategori: document.getElementById("kategori").value.trim(),
    deskripsi: document.getElementById("desk").value.trim(),
    nominal: Number(document.getElementById("nominal").value),
    updatedAt: new Date().toISOString()
  };

  if (Object.values(data).some(v => !v)) {
    alert("Semua data wajib diisi");
    return;
  }

  const ref = modeEdit
    ? db.ref(`Transaksi/${currentUser}/${editId}`)
    : db.ref(`Transaksi/${currentUser}`).push();

  if (!modeEdit) data.createdAt = new Date().toISOString();

  ref.set(data).then(() => {
    alert(modeEdit ? "Transaksi diperbarui" : "Transaksi ditambahkan");
    resetForm();
    loadRiwayat();
  });
}

// =======================
// RESET FORM TRANSAKSI
// =======================
function resetForm() {
  ["jenis","tanggal","metode","kategori","desk","nominal"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

  modeEdit = false;
  editId = null;
}

// =======================
// RESET FILTER
// =======================
function resetfilter() {
  document.getElementById("filterjenis").value = "";
  document.getElementById("filterMetode").value = "";
  document.getElementById("filterKategori").value = "";
  document.getElementById("tanggalawal").value = "";
  document.getElementById("tanggalakhir").value = "";

  loadRiwayat();
}

// =======================
// AUTO LOAD EDIT MODE
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadRiwayat();

  const id = new URLSearchParams(location.search).get("edit");
  if (!id) return;

  editId = id;
  modeEdit = true;

  db.ref(`Transaksi/${currentUser}/${id}`).once("value").then(snap => {
    if (!snap.exists()) return;
    const d = snap.val();

    jenis.value = d.jenis;
    tanggal.value = d.tanggal;
    metode.value = d.metode;
    kategori.value = d.kategori;
    desk.value = d.deskripsi;
    nominal.value = d.nominal;
  });
});
