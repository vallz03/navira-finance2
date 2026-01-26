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
const database = firebase.database();

// === Profil js === //
// ==========================
// CEK SESSION LOGIN
// ==========================
const userKey = localStorage.getItem("loginUser");

if (!userKey) {
  alert("Silakan login terlebih dahulu");
  window.location.href = "index.html";
}

// ==========================
// AMBIL DATA USER DARI FIREBASE
// ==========================
database.ref("users/" + userKey).once("value")
  .then(snapshot => {
    if (!snapshot.exists()) {
      alert("Data user tidak ditemukan");
      return;
    }

    const data = snapshot.val();

    document.getElementById("profilusername").textContent =
      "Username : " + data.username;

    // password dimasking
    const maskedPassword = maskPassword(data.password);

    document.getElementById("profilpassword").textContent =
      "Password : " + maskedPassword;
  })
  .catch(error => {
    console.error(error);
    alert("Gagal mengambil data profil");
  });

// ==========================
// LOGOUT
// ==========================
function logout() {
  localStorage.removeItem("loginUser");
  window.location.href = "index.html";
}

function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    el.textContent = "🔓";
  } else {
    input.type = "password";
    el.textContent = "🔒";
  }
}

// ==========================
// UBAH SANDI
// ==========================
function ubahsandi() {
  const sandiLama = document.getElementById("sandiLama").value.trim();
  const sandiBaru = document.getElementById("ubahsandi").value.trim();
  const konfirmasi = document.getElementById("konfirmasiSandi").value.trim();
  const msg = document.getElementById("msgSandi");

  msg.textContent = "";
  msg.style.color = "";

  // VALIDASI FIELD
  if (!sandiLama || !sandiBaru || !konfirmasi) {
    msg.textContent = "Semua field wajib diisi";
    msg.style.color = "#dc2626";
    return;
  }

  if (sandiBaru.length < 6) {
    msg.textContent = "Sandi baru minimal 6 karakter";
    msg.style.color = "#dc2626";
    return;
  }

  if (sandiBaru !== konfirmasi) {
    msg.textContent = "Konfirmasi sandi tidak cocok";
    msg.style.color = "#dc2626";
    return;
  }

  // CEK SANDI LAMA
  database.ref("users/" + userKey).once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        throw new Error("Data user tidak ditemukan");
      }

      const data = snapshot.val();

      if (data.password !== sandiLama) {
        throw new Error("Sandi lama salah");
      }

      // UPDATE SANDI BARU
      return database.ref("users/" + userKey).update({
        password: sandiBaru,
        updatedAt: new Date().toISOString()
      });
    })
    .then(() => {
      msg.textContent = "Sandi berhasil diperbarui";
      msg.style.color = "#16a34a";

      document.getElementById("sandiLama").value = "";
      document.getElementById("ubahsandi").value = "";
      document.getElementById("konfirmasiSandi").value = "";
    })
    .catch(error => {
      msg.textContent = error.message || "Gagal memperbarui sandi";
      msg.style.color = "#dc2626";
      console.error(error);
    });
}

function maskPassword(password, showStart = 1, showEnd = 1) {
  if (!password) return "";

  if (password.length <= showStart + showEnd) {
    return "*".repeat(password.length);
  }

  const start = password.slice(0, showStart);
  const end = password.slice(password.length - showEnd);
  const masked = "*".repeat(password.length - (showStart + showEnd));

  return start + masked + end;
}
