// Configuración de Firebase (actualiza con tus credenciales)
const firebaseConfig = {
  apiKey: "AIzaSyCl1tf96zBnVDD2GlWSomwABXyRjgL9J1w",
  authDomain: "senati-48545.firebaseapp.com",
  databaseURL: "https://senati-48545-default-rtdb.firebaseio.com",
  projectId: "senati-48545",
  storageBucket: "senati-48545.firebasestorage.app",
  messagingSenderId: "646651297698",
  appId: "1:646651297698:web:e93f9ebcb30b83383b3cfb",
  measurementId: "G-VCZZC71P50"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Bandera para controlar si los datos se han guardado
let isDataSaved = false;

// Funciones para mostrar formularios
function showRegister() {
  $('#loginForm').hide();
  $('#registerForm').show();
  $('#confirmForm').hide();
  $('#errorMessage').hide();
}

function showLogin() {
  $('#loginForm').show();
  $('#registerForm').hide();
  $('#confirmForm').hide();
  $('#errorMessage').hide();
}

function showConfirm() {
  $('#loginForm').hide();
  $('#registerForm').hide();
  $('#confirmForm').show();
  $('#errorMessage').hide();
}

// Manejo de Login
$('#loginFormSubmit').on('submit', function(e) {
  e.preventDefault();
  const email = $('#loginEmail').val();
  const password = $('#loginPassword').val();

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert('¡Bienvenido!');
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      alert('Error: ' + error.message);
    });
});

// Manejo de Registro
$('#registerFormSubmit').on('submit', function(e) {
  e.preventDefault();
  const name = $('#name').val();
  const lastName = $('#lastName').val();
  const email = $('#email').val();
  const password = $('#password').val();

  sessionStorage.setItem('tempUser', JSON.stringify({ name, lastName, email, password }));
  showConfirm();
});

// Confirmación de Registro
$('#confirmFormSubmit').on('submit', function(e) {
  e.preventDefault();
  const confirmPassword = $('#confirmPassword').val();
  const tempUser = JSON.parse(sessionStorage.getItem('tempUser'));

  if (tempUser.password === confirmPassword) {
    auth.createUserWithEmailAndPassword(tempUser.email, tempUser.password)
      .then((userCredential) => {
        // Guardar datos adicionales en Realtime Database
        database.ref('users/' + userCredential.user.uid).set({
          nombre: tempUser.name,
          apellido: tempUser.lastName,
          email: tempUser.email,
          fechaRegistro: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          isDataSaved = true; // Marcar que los datos se han guardado
          alert('Registro exitoso!');
          sessionStorage.removeItem('tempUser');
          window.location.href = 'dashboard.html'; // Redirigir después de guardar los datos
        }).catch((error) => {
          alert('Error al guardar datos: ' + error.message);
        });
      })
      .catch((error) => {
        alert('Error de registro: ' + error.message);
      });
  } else {
    $('#errorMessage').show();
  }
});

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
  if (user && isDataSaved) {
    // Usuario autenticado y datos guardados
    if (window.location.pathname.includes('index.html')) {
      window.location.href = 'dashboard.html';
    }
  } else if (!user) {
    // Usuario no autenticado
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = 'index.html';
    }
  }
});