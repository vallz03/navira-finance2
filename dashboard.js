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
  location.href = "index.html";
}

// =======================
// ELEMENT
// =======================
const elSaldo   = document.getElementById("total-balance");
const elIncome  = document.getElementById("total-income");
const elExpense = document.getElementById("pengeluaran");

const bulanFilter = document.getElementById("bulanFilter");
const tahunFilter = document.getElementById("tahunFilter");

const trxContainer = document.querySelector(".transaksiterbaru");

// =======================
// GLOBAL STATE
// =======================
let semuaTransaksi = [];
let chartInstance = null;
let chartMode = "bar"; // bar | candle

// =======================
// FORMAT RUPIAH
// =======================
function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

// =======================
// INIT TAHUN FILTER
// =======================
function initTahunFilter() {
  const now = new Date().getFullYear();
  tahunFilter.innerHTML = `<option value="">Tahun Terbaru</option>`;

  for (let i = now; i >= now - 5; i--) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    tahunFilter.appendChild(opt);
  }
}

// =======================
// LOAD DATA REALTIME
// =======================
db.ref(`Transaksi/${currentUser}`).on("value", snap => {
  semuaTransaksi = [];
  snap.forEach(c => {
    const d = c.val();
    if (d && d.tanggal) semuaTransaksi.push(d);
  });
  renderDashboard();
});

// =======================
// RENDER DASHBOARD (INTI)
// =======================
function renderDashboard() {
  let totalIn = 0;
  let totalOut = 0;

  const chartIncome = Array(12).fill(0);
  const chartExpense = Array(12).fill(0);

  // tanggal terbaru
  let latest = 0;
  semuaTransaksi.forEach(t => {
    const ts = new Date(t.tanggal).getTime();
    if (!isNaN(ts) && ts > latest) latest = ts;
  });

  const refDate = latest ? new Date(latest) : new Date();

  const activeMonth = bulanFilter.value !== ""
    ? Number(bulanFilter.value) - 1
    : refDate.getMonth();

  const activeYear = tahunFilter.value !== ""
    ? Number(tahunFilter.value)
    : refDate.getFullYear();

  // hitung transaksi
  semuaTransaksi.forEach(t => {
    const d = new Date(t.tanggal);
    if (isNaN(d)) return;

    const bulan = d.getMonth();
    const tahun = d.getFullYear();
    const nominal = Number(t.nominal) || 0;
    const jenis = (t.jenis || "").toLowerCase();

    if (tahun === activeYear) {
      if (jenis === "pemasukan") chartIncome[bulan] += nominal;
      if (jenis === "pengeluaran") chartExpense[bulan] += nominal;
    }

    if (bulan === activeMonth && tahun === activeYear) {
      if (jenis === "pemasukan") totalIn += nominal;
      if (jenis === "pengeluaran") totalOut += nominal;
    }
  });

  // update ringkasan
  elIncome.innerText = rupiah(totalIn);
  elExpense.innerText = rupiah(totalOut);
  elSaldo.innerText = rupiah(totalIn - totalOut);

  // chart
  if (chartMode === "bar") {
    tampilkanChart(chartIncome, chartExpense, activeYear);
  } else {
    const candle = hitungCandleSaldoTahunan(semuaTransaksi, activeYear);
    tampilkanCandlestick(candle, activeYear);
  }

  // transaksi terbaru
  tampilkanTransaksiTerbaru(semuaTransaksi);
}

// =======================
// CANDLE DATA
// =======================
function hitungCandleSaldoTahunan(data, tahun) {
  const hasil = [];
  let saldo = 0;

  // urutkan semua transaksi
  const sorted = data
    .filter(t => new Date(t.tanggal).getFullYear() <= tahun)
    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

  for (let bulan = 0; bulan < 12; bulan++) {
    const transaksiBulan = sorted.filter(t => {
      const d = new Date(t.tanggal);
      return d.getFullYear() === tahun && d.getMonth() === bulan;
    });

    const open = saldo;

    let high = open;
    let low = open;

    transaksiBulan.forEach(t => {
      const jenis = (t.jenis || "").toLowerCase();
      const nominal = Number(t.nominal) || 0;
      saldo += jenis === "pemasukan" ? nominal : -nominal;
      high = Math.max(high, saldo);
      low = Math.min(low, saldo);
    });

    const close = saldo;

    // ⚠️ PENTING: walau tidak ada transaksi, tetap push candle
    hasil.push({
      x: new Date(tahun, bulan, 1),
      o: open,
      h: high,
      l: low,
      c: close
    });
  }

  return hasil;
}

// =======================
// BAR CHART
// =======================
function tampilkanChart(income, expense, tahun) {
  const ctx = document.getElementById("myChart");
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      datasets: [
        { label: "Pemasukan", data: income, backgroundColor: "#4CAF50" },
        { label: "Pengeluaran", data: expense, backgroundColor: "#F44336" }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Ringkasan Keuangan ${tahun}`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => rupiah(v) }
        }
      }
    }
  });
}

// =======================
// CANDLE CHART
// =======================
function tampilkanCandlestick(data, tahun) {
  const ctx = document.getElementById("myChart");
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "candlestick",
    data: {
      datasets: [{
        label: `Saldo Bulanan ${tahun}`,
        data: data
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `Candlestick Saldo ${tahun}`
        }
      },
      scales: {
        x: { type: "time", time: { unit: "month" } },
        y: { ticks: { callback: v => rupiah(v) } }
      }
    }
  });
}

// =======================
// TRANSAKSI TERBARU
// =======================
function tampilkanTransaksiTerbaru(data) {
  trxContainer.innerHTML = "<h2>Transaksi Terbaru</h2>";

  if (!data || !data.length) {
    trxContainer.innerHTML += `<p class="text-muted">Belum ada transaksi</p>`;
    return;
  }

  const sorted = [...data]
    .filter(t => t.tanggal && t.nominal)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 5);

  sorted.forEach(t => {
    const isIn = (t.jenis || "").toLowerCase() === "pemasukan";
    const tanggal = new Date(t.tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const div = document.createElement("div");
    div.className = `trx-item ${isIn ? "income" : "expense"}`;

    div.innerHTML = `
      <div class="trx-top">
        <strong>${t.deskripsi || "Tanpa deskripsi"}</strong>
        <span class="trx-amount">
          ${isIn ? "+" : "-"} ${rupiah(t.nominal)}
        </span>
      </div>
      <div class="trx-bottom">
        <small>${tanggal}</small>
        <small>${t.metode || "-"}</small>
      </div>
    `;

    trxContainer.appendChild(div);
  });
}
