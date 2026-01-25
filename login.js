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

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Username dan password wajib diisi!");
    return;
  }

  database.ref("users/" + username).once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        alert("Username tidak ditemukan");
        return;
      }

      const data = snapshot.val();

      if (data.password !== password) {
        alert("Password salah");
        return;
      }
      localStorage.setItem("loginUser", username);

      alert("Login berhasil!");
      window.location.href = "profil.html";
    })
    .catch(error => {
      console.error(error);
      alert("Terjadi kesalahan sistem");
    });
}

function daftar() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Username dan password wajib diisi!");
    return;
  }

  if (password.length < 6) {
    alert("Password minimal 6 karakter");
    return;
  }

  database.ref("users/" + username).once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        alert("Username sudah terdaftar");
        return;
      }

      database.ref("users/" + username).set({
        username: username,
        password: password,
        role: "user",
        createdAt: new Date().toISOString()
      });

      alert("Pendaftaran berhasil, silakan login");
      document.getElementById("password").value = "";
    })
    .catch(error => {
      console.error(error);
      alert("Gagal mendaftar user");
    });
}
