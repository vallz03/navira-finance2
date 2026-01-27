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
  window.location.href = "index.html";
}

// =======================
// FORMAT RUPIAH
// =======================
function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

// =======================
// FORMAT TANGGAL & JAM
// =======================
function formatTanggal(tgl) {
  return tgl.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatJam(tgl) {
  return tgl.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// =======================
// REKAP BULANAN (SEPERTI FOTO)
// =======================
function loadRekapBulanan(bulanDipilih = null, tahunDipilih = null) {
  const now = new Date();
  const bulan = bulanDipilih !== null ? bulanDipilih : now.getMonth();
  const tahun = tahunDipilih !== null ? tahunDipilih : now.getFullYear();

  document.getElementById("judulBulan").innerText =
    new Date(tahun, bulan).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });

  let masuk = 0;
  let keluar = 0;

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.tanggal || !d.jenis || !d.nominal) return;

      const tgl = new Date(d.tanggal);
      if (tgl.getMonth() !== bulan || tgl.getFullYear() !== tahun) return;

      const nominal = Number(d.nominal);
      if (d.jenis.toLowerCase() === "pemasukan") masuk += nominal;
      if (d.jenis.toLowerCase() === "pengeluaran") keluar += nominal;
    });

    saldoMasuk.innerText = rupiah(masuk);
    saldoKeluar.innerText = rupiah(keluar);
  });
}

// =======================
// LOAD RIWAYAT
// =======================
function loadRiwayat() {
  const container = document.getElementById("riwayatTransaksi");
  container.innerHTML = "<p>Memuat...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";
    if (!snapshot.exists()) {
      container.innerHTML = "<p>Belum ada transaksi</p>";
      loadRekapBulanan();
      return;
    }

    const now = new Date();
    let data = [];

    snapshot.forEach(child => {
      data.push({ id: child.key, ...child.val() });
    });

    data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    let bulanTerakhir = "";

    data.forEach(d => {
      const tgl = new Date(d.tanggal);
      const keyBulan = tgl.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric"
      });

      if (keyBulan !== bulanTerakhir) {
        const h = document.createElement("div");
        h.className = "bulan-header";
        h.innerText = keyBulan;
        container.appendChild(h);
        bulanTerakhir = keyBulan;
      }

      renderItem(container, d);
    });

    loadRekapBulanan();
  });
}

// =======================
// RENDER ITEM + EDIT & HAPUS
// =======================
function renderItem(container, d) {
  const tgl = new Date(d.tanggal);
  const isMasuk = d.jenis.toLowerCase() === "pemasukan";

  const div = document.createElement("div");
  div.className = "transaksi-item";

  div.innerHTML = `
    <div class="transaksi-icon">${isMasuk ? "👤" : "🏪"}</div>

    <div class="transaksi-info">
      <div class="transaksi-judul">${isMasuk ? "Transfer" : "Pembayaran"}</div>
      <div class="transaksi-tanggal">
        ${formatTanggal(tgl)}, ${formatJam(tgl)}
      </div>
      <small>${d.kategori || "-"} • ${d.metode || "-"}</small>
    </div>

    <div class="transaksi-nominal ${isMasuk ? "masuk" : "keluar"}">
      ${isMasuk ? "+" : "-"}${rupiah(d.nominal)}
    </div>

    <div class="aksi">
      <button onclick="editTransaksi('${d.id}')">✏️</button>
      <button onclick="hapusTransaksi('${d.id}')">🗑️</button>
    </div>
  `;

  container.appendChild(div);
}

// =======================
// EDIT TRANSAKSI
// =======================
function editTransaksi(id) {
  db.ref(`Transaksi/${currentUser}/${id}`).once("value").then(snap => {
    const d = snap.val();
    if (!d) return;

    const nominal = prompt("Edit Nominal:", d.nominal);
    if (nominal === null) return;

    const kategori = prompt("Edit Kategori:", d.kategori || "");
    const metode = prompt("Edit Metode:", d.metode || "");
    const deskripsi = prompt("Edit Deskripsi:", d.deskripsi || "");

    db.ref(`Transaksi/${currentUser}/${id}`).update({
      nominal: Number(nominal),
      kategori,
      metode,
      deskripsi
    }).then(() => {
      loadRiwayat();
    });
  });
}

// =======================
// HAPUS TRANSAKSI
// =======================
function hapusTransaksi(id) {
  if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

  db.ref(`Transaksi/${currentUser}/${id}`).remove().then(() => {
    loadRiwayat();
  });
}

// =======================
// FILTER
// =======================
function terapkan() {
  const jenis = document.getElementById("filterjenis").value.toLowerCase();
  const metode = document.getElementById("filterMetode").value.toLowerCase();
  const kategori = document.getElementById("filterKategori").value.toLowerCase();
  const bulanVal = document.getElementById("bulan").value;
  const tahunVal = document.getElementById("tahun").value;

  const bulan = bulanVal !== "" ? Number(bulanVal) : null;
  const tahun = tahunVal !== "" ? Number(tahunVal) : null;

  const container = document.getElementById("riwayatTransaksi");
  container.innerHTML = "<p>Memuat...</p>";

  let data = [];

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";
    if (!snapshot.exists()) {
      container.innerHTML = "<p>Data tidak ditemukan</p>";
      return;
    }

    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.tanggal) return;

      const tgl = new Date(d.tanggal);

      // FILTER BULAN
      if (bulan !== null && tgl.getMonth() !== bulan) return;

      // FILTER TAHUN
      if (tahun !== null && tgl.getFullYear() !== tahun) return;

      // FILTER JENIS
      if (jenis && d.jenis.toLowerCase() !== jenis) return;

      // FILTER METODE
      if (metode && !(d.metode || "").toLowerCase().includes(metode)) return;

      // FILTER KATEGORI
      if (kategori && !(d.kategori || "").toLowerCase().includes(kategori)) return;

      data.push({ id: child.key, ...d });
    });

    if (!data.length) {
      container.innerHTML = "<p>Data tidak ditemukan</p>";
      saldoMasuk.innerText = "Rp 0";
      saldoKeluar.innerText = "Rp 0";
      return;
    }

    data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    let bulanTerakhir = "";

    data.forEach(d => {
      const tgl = new Date(d.tanggal);
      const keyBulan = tgl.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric"
      });

      if (keyBulan !== bulanTerakhir) {
        const h = document.createElement("div");
        h.className = "bulan-header";
        h.innerText = keyBulan;
        container.appendChild(h);
        bulanTerakhir = keyBulan;
      }

      renderItem(container, d);
    });

    // 🔥 REKAP DISINKRONKAN DENGAN FILTER
    loadRekapBulanan(bulan, tahun);
  });
}

function resetfilter() {
  document.getElementById("filterjenis").value = "";
  document.getElementById("filterMetode").value = "";
  document.getElementById("filterKategori").value = "";
  document.getElementById("bulan").value = "";
  document.getElementById("tahun").value = new Date().getFullYear();

  loadRiwayat();
  loadRekapBulanan();
}

// =======================
// AUTO LOAD
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadRiwayat();
});