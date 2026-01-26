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
  location.href = "index.html";
}

// =======================
// WAKTU REALTIME GLOBAL
// =======================
const NOW = new Date();
const TAHUN_AKTIF = NOW.getFullYear().toString();
const BULAN_AKTIF = `${TAHUN_AKTIF}-${String(NOW.getMonth() + 1).padStart(2, "0")}`;

// =======================
// ELEMENT
// =======================
const elSaldo   = document.getElementById("total-balance");
const elIncome  = document.getElementById("total-income");
const elExpense = document.getElementById("pengeluaran");

const alertBox  = document.getElementById("peringatan");
const alertMsg  = document.getElementById("alert-message");
const alertList = document.getElementById("alert-recommend-list");

const trxContainer = document.querySelector(".transaksiterbaru");

let chartInstance = null;
let limitAnggaran = 0;

// =======================
// FORMAT RUPIAH
// =======================
function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

// =======================
// LOAD LIMIT ANGGARAN
// =======================
db.ref(`users/${currentUser}/limitAnggaran`)
  .on("value", s => limitAnggaran = Number(s.val()) || 0);

// =======================
// LOAD TRANSAKSI REALTIME
// =======================
db.ref(`Transaksi/${currentUser}`).on("value", snapshot => {

  let transaksi = [];

  let totalPemasukan = 0;
  let totalPengeluaran = 0;

  let latestTimestamp = 0;

  // ======================
  // DATA CHART (ARRAY 12 BULAN)
  // ======================
  const chartIncome = Array(12).fill(0);
  const chartExpense = Array(12).fill(0);

  snapshot.forEach(child => {
    const d = child.val();
    if (!d || !d.tanggal) return;

    const date = new Date(d.tanggal);
    if (isNaN(date)) return;

    const nominal = Number(d.nominal) || 0;
    const jenis = (d.jenis || "").toLowerCase();

    transaksi.push(d);

    const time = date.getTime();
    if (time > latestTimestamp) latestTimestamp = time;
  });

  // ======================
  // BULAN & TAHUN AKTIF (DARI DATA TERBARU)
  // ======================
  const activeDate = latestTimestamp ? new Date(latestTimestamp) : new Date();
  const activeMonth = activeDate.getMonth(); // 0–11
  const activeYear  = activeDate.getFullYear();

  // ======================
  // HITUNG TOTAL & CHART
  // ======================
  transaksi.forEach(d => {
    const date = new Date(d.tanggal);
    if (isNaN(date)) return;

    const bulan = date.getMonth();
    const tahun = date.getFullYear();
    const nominal = Number(d.nominal) || 0;
    const jenis = (d.jenis || "").toLowerCase();

    // DASHBOARD BULAN AKTIF
    if (bulan === activeMonth && tahun === activeYear) {
      if (jenis === "pemasukan") totalPemasukan += nominal;
      if (jenis === "pengeluaran") totalPengeluaran += nominal;
    }

    // CHART TAHUN AKTIF
    if (tahun === activeYear) {
      if (jenis === "pemasukan") chartIncome[bulan] += nominal;
      if (jenis === "pengeluaran") chartExpense[bulan] += nominal;
    }
  });

  // ======================
  // UPDATE UI
  // ======================
  elIncome.innerText  = rupiah(totalPemasukan);
  elExpense.innerText = rupiah(totalPengeluaran);
  elSaldo.innerText   = rupiah(totalPemasukan - totalPengeluaran);

  tampilkanPeringatan(totalPengeluaran);
  tampilkanChartTahunan(chartIncome, chartExpense, activeYear);
  tampilkanTransaksiTerbaru(transaksi);
});

// =======================
// PERINGATAN LIMIT
// =======================
function tampilkanPeringatan(total) {
  alertList.innerHTML = "";
  if (limitAnggaran > 0 && total >= limitAnggaran) {
    alertBox.classList.remove("hidden");
    alertMsg.innerText = "Pengeluaran melebihi limit anggaran!";
    ["Kurangi pengeluaran", "Evaluasi kategori", "Disiplin pencatatan"]
      .forEach(t => {
        const li = document.createElement("li");
        li.innerText = t;
        alertList.appendChild(li);
      });
  } else {
    alertBox.classList.add("hidden");
  }
}

// =======================
// CHART TAHUNAN
// =======================
function tampilkanChartTahunan(income, expense, tahun) {
  const canvas = document.getElementById("myChart");
  if (!canvas) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      datasets: [
        {
          label: "Pemasukan",
          data: income,
          backgroundColor: "#4CAF50"
        },
        {
          label: "Pengeluaran",
          data: expense,
          backgroundColor: "#F44336"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Perbandingan Pemasukan & Pengeluaran Tahun ${tahun}`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => rupiah(v)
          }
        }
      }
    }
  });
}

// =======================
// TRANSAKSI TERBARU
// =======================
function tampilkanTransaksiTerbaru(data = []) {
  trxContainer.innerHTML = "<h1>Transaksi Terbaru</h1>";

  if (!data.length) {
    trxContainer.innerHTML += "<p>Belum ada transaksi</p>";
    return;
  }

  data.slice(-5).reverse().forEach(trx => {
    const isIn = (trx.jenis || "").toLowerCase() === "pemasukan";
    const div = document.createElement("div");
    div.className = "trx-item";
    div.innerHTML = `
      <strong>${trx.deskripsi || "-"}</strong><br>
      <small>${trx.tanggal || "-"} • ${trx.metode || "-"}</small><br>
      <span style="color:${isIn ? "green" : "red"}">
        ${isIn ? "+" : "-"} ${rupiah(trx.nominal)}
      </span>
    `;
    trxContainer.appendChild(div);
  });
}
