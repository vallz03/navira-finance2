/* =======================
   FIREBASE CONFIG
======================= */
const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "PROJECT_ID.firebaseapp.com",
  databaseURL: "https://navira-finance-default-rtdb.firebaseio.com/",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* =======================
   CEK LOGIN
======================= */
const currentUser = localStorage.getItem("loginUser");
if (!currentUser) {
  alert("Silakan login terlebih dahulu");
  location.href = "index.html";
}

/* =======================
   ELEMENT
======================= */
const container   = document.getElementById("riwayatTransaksi");
const saldoMasuk  = document.getElementById("saldoMasuk");
const saldoKeluar = document.getElementById("saldoKeluar");
const sisaSaldo   = document.getElementById("sisaSaldo");

const filterJenis    = document.getElementById("filterjenis");
const filterKategori = document.getElementById("filterKategori");
const filterMetode   = document.getElementById("filterMetode");
const filterBulan    = document.getElementById("bulan");
const filterTahun    = document.getElementById("tahun");

const btnExport  = document.getElementById("btnExport");
const exportMenu = document.getElementById("exportMenu");

/* =======================
   STATE
======================= */
let semuaData = [];
let dataAktif = [];

/* =======================
   UTIL
======================= */
const rupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

const formatTanggal = t =>
  new Date(t).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});

const setJudulBulan = t =>
  document.getElementById("judulBulan").innerText = t;

const updateJumlahData = n =>
  document.getElementById("jumlahData").innerText =
    `Menampilkan ${n} transaksi`;

/* =======================
   REKAP
======================= */
function hitungRekap(data){
  let masuk = 0, keluar = 0;

  data.forEach(d=>{
    const n = Number(d.nominal)||0;
    if(d.jenis?.toLowerCase()==="pemasukan") masuk+=n;
    if(d.jenis?.toLowerCase()==="pengeluaran") keluar+=n;
  });

  saldoMasuk.innerText  = rupiah(masuk);
  saldoKeluar.innerText = rupiah(keluar);
  sisaSaldo.innerText   = rupiah(masuk-keluar);

  sisaSaldo.style.color =
    masuk-keluar>0 ? "#4CAF50" :
    masuk-keluar<0 ? "#F44336" : "#ccc";

  btnExport.disabled = !data.length;
  btnExport.style.opacity = data.length ? "1" : ".5";
}

/* =======================
   RENDER ITEM
======================= */
function renderItem(d){
  const masuk = d.jenis.toLowerCase()==="pemasukan";
  const div = document.createElement("div");
  div.className="transaksi-item";

  div.innerHTML=`
    <div class="transaksi-icon">${masuk?"💵":"💳"}</div>
    <div class="transaksi-info">
      <div class="transaksi-judul">${d.deskripsi||"-"}</div>
      <div class="transaksi-tanggal">${formatTanggal(d.tanggal)}</div>
      <small>${d.kategori||"-"} • ${d.metode||"-"}</small>
    </div>
    <div class="transaksi-nominal ${masuk?"masuk":"keluar"}">
      ${masuk?"+":"-"}${rupiah(d.nominal)}
    </div>
    <div class="aksi">
      <button class="btn-edit" data-id="${d.id}">✎</button>
      <button class="btn-hapus" data-id="${d.id}">⌫</button>
    </div>
  `;
  container.appendChild(div);
}

/* =======================
   FILTER SELECT AUTO
======================= */
function isiFilterSelect(data){
  const kategori = new Set();
  const metode   = new Set();

  data.forEach(d=>{
    if(d.kategori) kategori.add(d.kategori);
    if(d.metode) metode.add(d.metode);
  });

  filterKategori.innerHTML = `<option value="">Semua Kategori</option>`;
  filterMetode.innerHTML   = `<option value="">Semua Metode</option>`;

  [...kategori].sort().forEach(v=>{
    filterKategori.innerHTML+=`<option value="${v}">${v}</option>`;
  });
  [...metode].sort().forEach(v=>{
    filterMetode.innerHTML+=`<option value="${v}">${v}</option>`;
  });
}

/* =======================
   TAMPILKAN DATA
======================= */
function tampilkanData(data, judul){
  container.innerHTML="";

  if(!data.length){
    container.innerHTML="<p>Data tidak ditemukan</p>";
    setJudulBulan(judul);
    updateJumlahData(0);
    hitungRekap([]);
    return;
  }

  data.forEach(renderItem);
  updateJumlahData(data.length);
  hitungRekap(data);
  setJudulBulan(judul);

  dataAktif = data.map(d=>({
    Tanggal: formatTanggal(d.tanggal),
    Jenis: d.jenis,
    Kategori: d.kategori||"-",
    Metode: d.metode||"-",
    Deskripsi: d.deskripsi||"-",
    Nominal: Number(d.nominal)
  }));
}

/* =======================
   LOAD DATA
======================= */
function loadRiwayat(){
  container.innerHTML="<p>Memuat...</p>";

  db.ref(`Transaksi/${currentUser}`).once("value").then(snap=>{
    semuaData=[];

    snap.forEach(c=>{
      semuaData.push({id:c.key,...c.val()});
    });

    semuaData.sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));
    isiFilterSelect(semuaData);
    tampilkanData(semuaData,"Semua Periode");
  });
}

/* =======================
   TERAPKAN FILTER
======================= */
function terapkan(){
  let data=[...semuaData];

  if(filterBulan.value)
    data=data.filter(d=>new Date(d.tanggal).getMonth()===Number(filterBulan.value));

  if(filterTahun.value)
    data=data.filter(d=>new Date(d.tanggal).getFullYear()===Number(filterTahun.value));

  if(filterJenis.value)
    data=data.filter(d=>d.jenis.toLowerCase()===filterJenis.value.toLowerCase());

  if(filterKategori.value)
    data=data.filter(d=>(d.kategori||"")===filterKategori.value);

  if(filterMetode.value)
    data=data.filter(d=>(d.metode||"")===filterMetode.value);

  let judul="Semua Periode";
  if(filterBulan.value && filterTahun.value){
    judul=new Date(filterTahun.value,filterBulan.value)
      .toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  } else if(filterTahun.value){
    judul=`Tahun ${filterTahun.value}`;
  } else if(filterBulan.value){
    judul=new Date(2024,filterBulan.value)
      .toLocaleDateString("id-ID",{month:"long"});
  }

  tampilkanData(data,judul);
}

/* =======================
   RESET FILTER
======================= */
function resetfilter(){
  filterJenis.value="";
  filterKategori.value="";
  filterMetode.value="";
  filterBulan.value="";
  filterTahun.value="";
  tampilkanData(semuaData,"Semua Periode");
}

/* =======================
   EXPORT
======================= */
function closeExport(){exportMenu.style.display="none";}

function exportExcel(){
  if(!dataAktif.length) return alert("Tidak ada data");
  closeExport();
  const ws=XLSX.utils.json_to_sheet(dataAktif);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Transaksi");
  XLSX.writeFile(wb,`Transaksi_${currentUser}.xlsx`);
}

function exportPDF(){
  if(!dataAktif.length) return alert("Tidak ada data");
  closeExport();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF("l","mm","a4");
  doc.text("Laporan Transaksi",14,15);
  doc.autoTable({
    startY:20,
    head:[Object.keys(dataAktif[0])],
    body:dataAktif.map(Object.values)
  });
  doc.save(`Transaksi_${currentUser}.pdf`);
}

function exportSpreadsheet(){
  if(!dataAktif.length) return alert("Tidak ada data");
  closeExport();
  const csv=[
    Object.keys(dataAktif[0]).join(","),
    ...dataAktif.map(d=>Object.values(d).join(","))
  ].join("\n");

  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download=`Transaksi_${currentUser}.csv`;
  a.click();
}

/* =======================
   EVENT
======================= */
document.addEventListener("DOMContentLoaded",loadRiwayat);

[filterJenis,filterKategori,filterMetode,filterBulan,filterTahun]
.forEach(el=>el.addEventListener("change",terapkan));

btnExport.onclick=e=>{
  e.stopPropagation();
  exportMenu.style.display=
    exportMenu.style.display==="block"?"none":"block";
};

document.addEventListener("click",()=>exportMenu.style.display="none");

container.addEventListener("click",e=>{
  if(e.target.classList.contains("btn-hapus")){
    db.ref(`Transaksi/${currentUser}/${e.target.dataset.id}`)
      .remove().then(loadRiwayat);
  }
  if(e.target.classList.contains("btn-edit")){
    location.href=`transaksi.html?edit=${e.target.dataset.id}`;
  }
});
