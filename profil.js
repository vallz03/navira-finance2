// ==========================
// FIREBASE CONFIG
// ==========================
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

const database = firebase.database();

// ==========================
// SESSION LOGIN CHECK
// ==========================
const userKey = localStorage.getItem("loginUser");

if (!userKey) {
  alert("Silakan login terlebih dahulu");
  window.location.href = "index.html";
}

// ==========================
// LOAD USER PROFILE
// ==========================
async function loadProfil() {
  try {
    const snapshot = await database.ref(`users/${userKey}`).once("value");

    if (!snapshot.exists()) {
      alert("Data user tidak ditemukan");
      return;
    }

    const data = snapshot.val();

    document.getElementById("profilusername").textContent =
      `Username : ${data.username}`;

    document.getElementById("profilpassword").textContent =
      `Password : ${maskPassword(data.password)}`;

  } catch (error) {
    console.error(error);
    alert("Gagal mengambil data profil");
  }
}

loadProfil();

// ==========================
// LOGOUT
// ==========================
function logout() {
  localStorage.removeItem("loginUser");
  window.location.href = "index.html";
}

// ==========================
// TOGGLE PASSWORD VISIBILITY
// ==========================
function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";

  input.type = isHidden ? "text" : "password";
  el.textContent = isHidden ? "👀" : "🚫";
}

// ==========================
// UPDATE PASSWORD
// ==========================
async function ubahsandi() {
  const sandiLama = document.getElementById("sandiLama").value.trim();
  const sandiBaru = document.getElementById("ubahsandi").value.trim();
  const konfirmasi = document.getElementById("konfirmasiSandi").value.trim();

  if (!sandiLama || !sandiBaru || !konfirmasi) {
    alert("Semua field wajib diisi");
    return;
  }

  if (sandiBaru.length < 6) {
    alert("Sandi baru minimal 6 karakter");
    return;
  }

  if (sandiBaru !== konfirmasi) {
    alert("Konfirmasi sandi tidak cocok");
    return;
  }

  try {
    const ref = database.ref(`users/${userKey}`);
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      throw new Error("Data user tidak ditemukan");
    }

    const data = snapshot.val();

    if (data.password !== sandiLama) {
      throw new Error("Sandi lama salah");
    }

    await ref.update({
      password: sandiBaru,
      updatedAt: new Date().toISOString()
    });

    alert("Sandi berhasil diperbarui");

    document.getElementById("sandiLama").value = "";
    document.getElementById("ubahsandi").value = "";
    document.getElementById("konfirmasiSandi").value = "";

  } catch (error) {
    console.error(error);
    alert(error.message || "Gagal memperbarui sandi");
  }
}

// ==========================
// MASK PASSWORD
// ==========================
function maskPassword(password, showStart = 1, showEnd = 1) {
  if (!password) return "";

  if (password.length <= showStart + showEnd) {
    return "*".repeat(password.length);
  }

  const start = password.slice(0, showStart);
  const end = password.slice(-showEnd);
  const masked = "*".repeat(password.length - (showStart + showEnd));

  return `${start}${masked}${end}`;
}

// ==========================
// DELETE ACCOUNT
// ==========================
async function hapusAkun() {
  const confirmDelete = confirm(
    "PERINGATAN!\n\nAkun dan seluruh data akan dihapus permanen.\n\nLanjutkan?"
  );
  if (!confirmDelete) return;

  const sandi = prompt("Masukkan sandi untuk konfirmasi:");
  if (!sandi) {
    alert("Penghapusan dibatalkan");
    return;
  }

  try {
    const userRef = database.ref(`users/${userKey}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      throw new Error("Data user tidak ditemukan");
    }

    const data = snapshot.val();
    if (data.password !== sandi) {
      throw new Error("Sandi salah");
    }

    await Promise.all([
      userRef.remove(),
      database.ref(`Transaksi/${userKey}`).remove()
    ]);

    alert("Akun berhasil dihapus");
    localStorage.removeItem("loginUser");
    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert(error.message || "Gagal menghapus akun");
  }
}
