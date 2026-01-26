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
// HITUNG SALDO BULAN INI
// =======================
function loadRekapBulanan() {
  const now = new Date();
  const bulan = now.getMonth();
  const tahun = now.getFullYear();

  hitungRekapPerBulan(bulan, tahun, hasil => {
    saldoMasuk.innerText  = rupiah(hasil.pemasukan);
    saldoKeluar.innerText = rupiah(hasil.pengeluaran);
    saldoBersih.innerText  = rupiah(hasil.saldo);
  });
}

// =======================
// REKAP PERBULAN (SEMUA BULAN)
// =======================
function loadRekapPerBulan() {
  const container = document.getElementById("rekapBulanan");
  if (!container) return; // jika tidak ada element, aman

  container.innerHTML = "<p>Memuat rekap...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      container.innerHTML = "<p>Belum ada transaksi</p>";
      return;
    }

    const rekap = {};

    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.tanggal || !d.jenis || !d.nominal) return;

      const tgl = new Date(d.tanggal);
      if (isNaN(tgl)) return;

      const key = `${tgl.getFullYear()}-${String(tgl.getMonth()+1).padStart(2,"0")}`;

      if (!rekap[key]) {
        rekap[key] = { pemasukan: 0, pengeluaran: 0 };
      }

      const nominal = Number(d.nominal);
      if (isNaN(nominal)) return;

      const jenis = String(d.jenis).trim().toLowerCase();

      if (jenis === "pemasukan") rekap[key].pemasukan += nominal;
      if (jenis === "pengeluaran") rekap[key].pengeluaran += nominal;
    });

    const bulanSorted = Object.keys(rekap).sort((a,b) => b.localeCompare(a));

    container.innerHTML = "";

    bulanSorted.forEach(bulan => {
      const masuk = rekap[bulan].pemasukan;
      const keluar = rekap[bulan].pengeluaran;
      const saldo = masuk - keluar;

      const div = document.createElement("div");
      div.className = "card-transaksi";

      div.innerHTML = `
        <b>Bulan ${bulan}</b><br>
        <span style="color:green">+ ${rupiah(masuk)}</span><br>
        <span style="color:red">- ${rupiah(keluar)}</span><br>
        <b>Saldo: ${rupiah(saldo)}</b>
      `;

      container.appendChild(div);
    });
  });
}

// =======================
// HITUNG REKAP BERDASARKAN BULAN & TAHUN
// =======================
function hitungRekapPerBulan(bulan, tahun, callback) {
  let totalMasuk = 0;
  let totalKeluar = 0;

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.tanggal || !d.jenis) return;

      const tgl = new Date(d.tanggal);
      if (isNaN(tgl)) return;

      if (tgl.getMonth() !== bulan || tgl.getFullYear() !== tahun) return;

      const nominal = Number(d.nominal);
      if (isNaN(nominal)) return;

      const jenis = String(d.jenis).trim().toLowerCase();

      if (jenis === "pemasukan") totalMasuk += nominal;
      if (jenis === "pengeluaran") totalKeluar += nominal;
    });

    callback({
      pemasukan: totalMasuk,
      pengeluaran: totalKeluar,
      saldo: totalMasuk - totalKeluar
    });
  });
}

function hitungRekapKeseluruhan() {
  let totalMasuk = 0;
  let totalKeluar = 0;

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.jenis || !d.nominal) return;

      const nominal = Number(d.nominal);
      if (isNaN(nominal)) return;

      const jenis = String(d.jenis).trim().toLowerCase();
      if (jenis === "pemasukan") totalMasuk += nominal;
      if (jenis === "pengeluaran") totalKeluar += nominal;
    });

    saldoMasuk.innerText = rupiah(totalMasuk);
    saldoKeluar.innerText = rupiah(totalKeluar);
    saldoBersih.innerText = rupiah(totalMasuk - totalKeluar);
  });
}

// =======================
// LOAD RIWAYAT BULAN INI
// =======================
function loadRiwayat() {
  const container = document.getElementById("riwayatTransaksi");
  container.innerHTML = "<p>Memuat data...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>Belum ada transaksi</p>";
      loadRekapBulanan();
      return;
    }

    const now = new Date();
    const bulan = now.getMonth();
    const tahun = now.getFullYear();

    let dataBulanan = [];

    snapshot.forEach(child => {
      const d = child.val();
      const tgl = new Date(d.tanggal);

      if (tgl.getMonth() === bulan && tgl.getFullYear() === tahun) {
        dataBulanan.push({ id: child.key, ...d });
      }
    });

    dataBulanan.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    dataBulanan.forEach(d => renderItem(container, d.id, d));

    loadRekapBulanan();
  });
}

// =======================
// FILTER TRANSAKSI
// =======================
function terapkan() {
  const jenis = filterjenis.value;
  const metode = filterMetode.value.trim().toLowerCase();
  const kategori = filterKategori.value.trim().toLowerCase();
  const bulanEl = document.getElementById("bulan").value;
  const tahunEl = document.getElementById("tahun").value;

  const container = document.getElementById("riwayatTransaksi");
  container.innerHTML = "<p>Memuat data...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snapshot => {
    container.innerHTML = "";
    let hasil = [];

    snapshot.forEach(child => {
      const d = child.val();
      const tgl = new Date(d.tanggal);

      const jenisData = String(d.jenis || "").trim().toLowerCase();

      // FILTER JENIS
      if (jenis && jenisData !== jenis.toLowerCase()) return;

      // FILTER METODE
      if (metode && !(d.metode || "").toLowerCase().includes(metode)) return;

      // FILTER KATEGORI
      if (kategori && !(d.kategori || "").toLowerCase().includes(kategori)) return;

      // FILTER BULAN (Hanya kalau dipilih)
      if (bulanEl !== "") {
        if (tgl.getMonth() !== Number(bulanEl)) return;
      }

      // FILTER TAHUN (Hanya kalau diisi)
      if (tahunEl !== "") {
        if (tgl.getFullYear() !== Number(tahunEl)) return;
      }

      hasil.push({ id: child.key, ...d });
    });

    if (!hasil.length) {
      container.innerHTML = "<p>Data tidak ditemukan</p>";
      loadRekapBulanan();
      return;
    }

    hasil.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    hasil.forEach(d => renderItem(container, d.id, d));

    // Kalau bulan dipilih, hitung rekap bulan itu
    if (bulanEl !== "") {
      const bulan = Number(bulanEl);
      const tahun = tahunEl !== "" ? Number(tahunEl) : new Date().getFullYear();

      hitungRekapPerBulan(bulan, tahun, hasil => {
        saldoMasuk.innerText = rupiah(hasil.pemasukan);
        saldoKeluar.innerText = rupiah(hasil.pengeluaran);
        saldoBersih.innerText = rupiah(hasil.saldo);
      });
    } else {
      // Kalau bulan tidak dipilih, tampilkan rekap keseluruhan (semua data)
      hitungRekapKeseluruhan();
    }
  });
}

// =======================
// RENDER ITEM
// =======================
function renderItem(container, id, d) {
  const div = document.createElement("div");
  div.className = "card-transaksi";

  const jenis = String(d.jenis).trim().toLowerCase();
  const isPemasukan = jenis === "pemasukan";
  const simbol = isPemasukan ? "+" : "-";
  const warna = isPemasukan ? "green" : "red";

  div.innerHTML = `
    <b>${jenis.toUpperCase()}</b> | ${d.tanggal}<br>
    ${d.kategori} - ${d.metode}<br>
    ${d.deskripsi}<br>
    <b style="color:${warna}">
      ${simbol} ${rupiah(d.nominal)}
    </b><br>
  `;

  container.appendChild(div);
}

// =======================
// RESET FILTER
// =======================
function resetfilter() {
  ["filterjenis","filterMetode","filterKategori"].forEach(id => document.getElementById(id).value = "");
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
  loadRekapBulanan();
  loadRekapPerBulan();
});
