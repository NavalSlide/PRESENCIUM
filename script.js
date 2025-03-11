// Configuración de Firebase
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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Bandera para controlar si los datos se han guardado
let isDataSaved = false;

// Sistema de notificaciones personalizado
(function() {
    // Crear el contenedor de notificaciones si no existe
    if (!document.querySelector('.custom-notification-container')) {
        const container = document.createElement('div');
        container.className = 'custom-notification-container';
        document.body.appendChild(container);
    }
    
    // Función para mostrar notificaciones
    window.showNotification = function(message, type = 'info', duration = 3000) {
        const container = document.querySelector('.custom-notification-container');
        
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.textContent = message;
        
        // Añadir al contenedor
        container.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Ocultar después del tiempo especificado
        const timeout = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300); // Tiempo para la animación de salida
        }, duration);
        
        return notification;
    };
    
    // Sobrescribir la función de alerta nativa
    const originalAlert = window.alert;
    window.alert = function(message) {
        showNotification(message, 'info');
        // Si quieres mantener el comportamiento original también, descomenta la siguiente línea:
        // originalAlert(message);
    };
    
    // Método para diferentes tipos de notificaciones
    window.notify = {
        success: function(message, duration) {
            return showNotification(message, 'success', duration);
        },
        error: function(message, duration) {
            return showNotification(message, 'error', duration);
        },
        info: function(message, duration) {
            return showNotification(message, 'info', duration);
        },
        warning: function(message, duration) {
            return showNotification(message, 'warning', duration);
        }
    };
    
    console.log('Sistema de notificaciones inicializado correctamente');
})();

// Sistema de diálogos de confirmación personalizado
function createConfirmationDialog() {
    // Verificar si ya existe un diálogo
    if (document.querySelector('.custom-dialog-overlay')) {
        return document.querySelector('.custom-dialog-overlay').__dialogData;
    }
    
    // Crear elementos del diálogo
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    
    const header = document.createElement('div');
    header.className = 'custom-dialog-header';
    header.textContent = 'Confirmar acción';
    
    const content = document.createElement('div');
    content.className = 'custom-dialog-content';
    
    const buttons = document.createElement('div');
    buttons.className = 'custom-dialog-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'custom-dialog-btn custom-dialog-btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'custom-dialog-btn custom-dialog-btn-confirm';
    confirmBtn.textContent = 'Eliminar';
    
    // Ensamblar el diálogo
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    dialog.appendChild(header);
    dialog.appendChild(content);
    dialog.appendChild(buttons);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const dialogData = {
        overlay,
        content,
        cancelBtn,
        confirmBtn
    };
    
    overlay.__dialogData = dialogData;
    
    return dialogData;
}

// Función para mostrar el diálogo de confirmación
function showCustomConfirmation(message, onConfirm, onCancel) {
    const dialog = createConfirmationDialog();
    
    // Establecer el mensaje
    dialog.content.textContent = message;
    
    // Configurar el botón cancelar
    dialog.cancelBtn.onclick = () => {
        hideDialog(dialog.overlay);
        if (onCancel) onCancel();
    };
    
    // Configurar el botón confirmar
    dialog.confirmBtn.onclick = () => {
        hideDialog(dialog.overlay);
        if (onConfirm) onConfirm();
    };
    
    // Mostrar el diálogo
    setTimeout(() => {
        dialog.overlay.classList.add('active');
    }, 10);
    
    // También permitir cerrar al hacer clic en el overlay
    dialog.overlay.onclick = (e) => {
        if (e.target === dialog.overlay) {
            hideDialog(dialog.overlay);
            if (onCancel) onCancel();
        }
    };
}

// Función para ocultar el diálogo
function hideDialog(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.remove();
    }, 300); // Tiempo para la animación
}

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
// Manejo de Login con mejores mensajes de error
$('#loginFormSubmit').on('submit', function(e) {
  e.preventDefault();
  const email = $('#loginEmail').val();
  const password = $('#loginPassword').val();

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      notify.success('¡Bienvenido!');
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      // Personalizar mensajes de error para una mejor experiencia de usuario
      let errorMessage;
      
      switch(error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Usuario o contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del correo electrónico no es válido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Inténtalo más tarde';
          break;
        default:
          errorMessage = 'Error al iniciar sesión: ' + error.message;
      }
      
      notify.error(errorMessage);
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
// Confirmación de Registro con mejores mensajes de error
$('#confirmFormSubmit').on('submit', function(e) {
  e.preventDefault();
  const confirmPassword = $('#confirmPassword').val();
  const tempUser = JSON.parse(sessionStorage.getItem('tempUser'));

  if (tempUser.password === confirmPassword) {
    auth.createUserWithEmailAndPassword(tempUser.email, tempUser.password)
      .then((userCredential) => {
        database.ref('users/' + userCredential.user.uid).set({
          nombre: tempUser.name,
          apellido: tempUser.lastName,
          email: tempUser.email,
          fechaRegistro: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          isDataSaved = true;
          notify.success('Registro exitoso!');
          sessionStorage.removeItem('tempUser');
          window.location.href = 'dashboard.html';
        }).catch((error) => {
          notify.error('Error al guardar datos: ' + error.message);
        });
      })
      .catch((error) => {
        // Personalizar mensajes de error para registro
        let errorMessage;
        
        switch(error.code) {
          case 'auth/weak-password':
            errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'Este correo electrónico ya está registrado';
            break;
          case 'auth/invalid-email':
            errorMessage = 'El formato del correo electrónico no es válido';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'El registro con email y contraseña no está habilitado';
            break;
          default:
            errorMessage = 'Error de registro: ' + error.message;
        }
        
        notify.error(errorMessage);
      });
  } else {
    $('#errorMessage').show();
    notify.error('Las contraseñas no coinciden');
  }
});

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
  if (user && isDataSaved) {
    if (window.location.pathname.includes('login.html')) {
      window.location.href = 'dashboard.html';
    }
  } else if (!user) {
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }
});