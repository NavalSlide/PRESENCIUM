// Configuración de Firebase (usando la que proporcionaste antes)
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Variables globales
var currentGroup = "";
var currentStudent = { id: "", name: "" };

// Función para redirigir a la página principal
const redirectToDashboard = () => {
    // Cambia 'dashboard.html' por el nombre de tu página principal
    if (!window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'dashboard.html';
    }
};

$(document).ready(function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('Usuario autenticado:', user);
            const userRef = database.ref('users/' + user.uid);
            userRef.once('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    $("#userName").text(userData.nombre);
                    $("#userLastName").text(userData.apellido);
                    $("#userEmail").text(userData.email);
                    $("#userDate").text(new Date(userData.fechaRegistro).toLocaleDateString());
                    // Redirigir a la página principal si no estamos en ella
                    redirectToDashboard();
                }
            });
        } else {
            // Redirigir a index.html solo si no estamos ya en ella
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });

    $("#profileIcon").click(function() {
        $("#profileMenu").toggle();
    });

    $("#logoutButton").click(function() {
        auth.signOut()
            .then(() => {
                alert('Sesión cerrada correctamente');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                alert('Error al cerrar sesión: ' + error.message);
            });
    });

$(".sidebar button").click(function() {
    let action = $(this).text();
    if (action === "Gestionar asistencia") {
        showAttendanceButtons();
        } else if (action === "Grupos a cargo") {
            showGroupButtons();
        } else if (action === "Gestionar estudiantes") {
            showStudentManagement();
        }
    });

    // Mostrar la pantalla principal por defecto si ya estamos autenticados
    if (auth.currentUser) {
        showAttendanceButtons();
    }
});

// Resto del código (showAttendanceButtons, loadMainAttendanceHistory, etc.) permanece igual
function showAttendanceButtons() {
    $(".main-content").html(`
        <div class='btn-container'>
            <button class='btn' id='history-btn'>Historial de asistencias</button>
            <button class='btn' id='mark-btn'>Marcar asistencia (DNI)</button>
        </div>
        <div class="attendance-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <button class="delete-history-btn">Borrar Historial</button>
            <h3>Historial de asistencias</h3>
            <p>Últimos registros</p>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Grupo</th>
                        <th>Estudiante</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="mainHistoryBody">
                    <tr><td colspan="4">Seleccione "Historial de asistencias" para cargar</td></tr>
                </tbody>
            </table>
        </div>
        <div class="mark-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <h3>Marcar asistencia</h3>
            <p>Ingrese su DNI</p>
            <input type="text" id="dniInput" placeholder="DNI">
            <button id="markAttendanceByDni">Marcar</button>
        </div>
    `);

    console.log("Attendance buttons shown in main-content");

    // Use event delegation for dynamically added buttons
    $(document).on("click", ".btn", function() {
        let action = $(this).text();
        console.log("Button clicked: ", action);
        $(".btn-container").hide();
        $(".back-btn").fadeIn();
        if (action === "Historial de asistencias") {
            $(".attendance-box").fadeIn();
            loadMainAttendanceHistory();
        } else if (action === "Marcar asistencia (DNI)") {
            $(".mark-box").fadeIn();
        }
    });

    // Event for marking attendance by DNI
    $("#markAttendanceByDni").click(function() {
        const dni = $("#dniInput").val().trim();
        if (!dni) {
            alert("Por favor ingrese un DNI");
            return;
        }
        markAttendanceByDni(dni);
    });

    // Event for returning to the main screen
    $(".back-btn").click(function() {
        $(".btn-container").fadeIn();
        $(".attendance-box, .mark-box").hide();
        $(".back-btn").hide();
    });

    // Event for deleting attendance history
    $(".delete-history-btn").click(function() {
        if (confirm("¿Estás seguro de que deseas borrar todo el historial de asistencias? Esta acción no se puede deshacer.")) {
            deleteAllAttendanceHistory();
        }
    });
}

function loadMainAttendanceHistory() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const attendanceRef = firebase.database().ref('users/' + user.uid + '/attendance');
    attendanceRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#mainHistoryBody").html(`<tr><td colspan="4">No hay asistencias registradas</td></tr>`);
            return;
        }

        $("#mainHistoryBody").empty();
        const allAttendances = [];
        snapshot.forEach((studentSnapshot) => {
            studentSnapshot.forEach((attendanceSnapshot) => {
                const attendance = attendanceSnapshot.val();
                allAttendances.push(attendance);
            });
        });

        // Ordenar por timestamp descendente (más reciente primero)
        allAttendances.sort((a, b) => b.timestamp - a.timestamp);
        const recentAttendances = allAttendances.slice(0, 20); // Mostrar solo los 20 más recientes

        if (recentAttendances.length === 0) {
            $("#mainHistoryBody").html(`<tr><td colspan="4">No hay registros recientes</td></tr>`);
        } else {
            recentAttendances.forEach((attendance) => {
                $("#mainHistoryBody").append(`
                    <tr>
                        <td>${attendance.date}</td>
                        <td>${attendance.groupName}</td>
                        <td>${attendance.studentName}</td>
                        <td style="${attendance.status === 'Presente' ? 'color:green;' : 'color:red;'}">${attendance.status}</td>
                    </tr>
                `);
            });
        }
    });
}


// Función para marcar asistencia por DNI
function markAttendanceByDni(dni) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        let found = false;
        snapshot.forEach((groupSnapshot) => {
            const group = groupSnapshot.val();
            const students = group.students || {};
            found = Object.keys(students).some((studentId) => {
                const student = students[studentId];
                if (student.dni === dni) {
                    console.log("Estudiante encontrado:", student.name); // Para depurar
                    markAttendance(studentId, student.name, group.name, "Presente");
                    return true; // Detiene la iteración de some
                }
                return false;
            });
            return found; // Detiene la iteración de forEach si found es true
        });
        if (!found) {
            alert("No se encontró ningún estudiante con ese DNI en tus grupos");
        }
    }).catch((error) => {
        alert("Error al buscar estudiante: " + error.message);
    });
}

// Función para mostrar los botones de grupo
function showAttendanceButtons() {
    $(".main-content").html(`
        <div class='btn-container'>
            <button class='btn' id='history-btn'>Historial de asistencias</button>
            <button class='btn' id='mark-btn'>Marcar asistencia (DNI)</button>
        </div>
        <div class="attendance-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <button class="delete-history-btn">Borrar Historial</button>
            <h3>Historial de asistencias</h3>
            <p>Últimos registros</p>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Grupo</th>
                        <th>Estudiante</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="mainHistoryBody">
                    <tr><td colspan="4">Seleccione "Historial de asistencias" para cargar</td></tr>
                </tbody>
            </table>
        </div>
        <div class="mark-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <h3>Marcar asistencia</h3>
            <p>Ingrese su DNI</p>
            <input type="text" id="dniInput" placeholder="DNI">
            <button id="markAttendanceByDni">Marcar</button>
        </div>
    `);

    console.log("Attendance buttons shown in main-content");

    // Use event delegation for dynamically added buttons
    $(document).on("click", ".btn", function() {
        let action = $(this).text();
        console.log("Button clicked: ", action);
        $(".btn-container").hide();
        $(".back-btn").fadeIn();
        if (action === "Historial de asistencias") {
            $(".attendance-box").fadeIn();
            loadMainAttendanceHistory();
        } else if (action === "Marcar asistencia (DNI)") {
            $(".mark-box").fadeIn();
        }
    });

    // Event for marking attendance by DNI
    $("#markAttendanceByDni").click(function() {
        const dni = $("#dniInput").val().trim();
        if (!dni) {
            alert("Por favor ingrese un DNI");
            return;
        }
        markAttendanceByDni(dni);
    });

    // Event for returning to the main screen
    $(".back-btn").click(function() {
        $(".btn-container").fadeIn();
        $(".attendance-box, .mark-box").hide();
        $(".back-btn").hide();
    });

    // Event for deleting attendance history
    $(".delete-history-btn").click(function() {
        if (confirm("¿Estás seguro de que deseas borrar todo el historial de asistencias? Esta acción no se puede deshacer.")) {
            deleteAllAttendanceHistory();
        }
    });
}

// Mostrar botones de grupo
function showGroupButtons() {
    $(".main-content").html(`
        <h2>Mis Grupos</h2>
        <div class='group-box'>
            <button>911NYC - Desarrollo Python</button>
            <button>4632NC - Desarrollo Web</button>
            <button>L4D2 - Desarrollo de videojuegos</button>
        </div>
        <div class="group-overlay" id="groupOverlay">
            <button class="close-btn">X</button>
            <h3 id="groupTitle">911NYC - Desarrollo Python</h3>
            <div class="name-list" id="studentsList">
                <!-- Los estudiantes se cargarán dinámicamente -->
            </div>
        </div>
        <div class="attendance-menu-overlay" id="attendanceMenuOverlay">
            <button class="close-btn">X</button>
            <h3 id="studentName"></h3>
            <div class="attendance-menu-buttons">
                <button id="markAttendanceBtn">Marcar asistencia</button>
                <button id="deleteAttendanceBtn">Eliminar asistencia</button>
                <button id="viewHistoryBtn">Ver historial</button>
            </div>
        </div>
        <div class="attendance-history-overlay" id="attendanceHistoryOverlay" style="display:none;">
            <button class="close-btn">X</button>
            <h3>Historial de Asistencias</h3>
            <div id="attendanceHistory">
                <table style="width:100%; margin-top:40px; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="padding:10px; background:#888; color:white; border-radius:5px 0 0 5px;">Fecha</th>
                            <th style="padding:10px; background:#888; color:white; border-radius:0 5px 5px 0;">Estado</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceHistoryBody">
                        <!-- El historial se cargará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `);

    $("#groupOverlay").hide();
    $("#attendanceMenuOverlay").hide();
    $("#attendanceHistoryOverlay").hide();

    $(".group-box button").click(function() {
        let groupName = $(this).text();
        $("#groupTitle").text(groupName);
        currentGroup = groupName;
        loadStudentsFromGroup(groupName);
        $(".group-box").hide();
        $("#groupOverlay").fadeIn();
    });

    $("#groupOverlay .close-btn").click(function() {
        $("#groupOverlay").hide();
        $(".group-box").fadeIn();
    });

    $("#studentsList").on("click", ".attendance-btn", function() {
        let studentName = $(this).prev("span").text();
        let studentId = $(this).data("student-id");
        currentStudent = { id: studentId, name: studentName };
        $("#studentName").text(studentName);
        $("#groupOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    $("#attendanceMenuOverlay .close-btn").click(function() {
        $("#attendanceMenuOverlay").hide();
        $("#groupOverlay").fadeIn();
    });

    $("#attendanceHistoryOverlay .close-btn").click(function() {
        $("#attendanceHistoryOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    $("#markAttendanceBtn").click(function() {
        markAttendance(currentStudent.id, currentStudent.name, currentGroup, "Presente");
    });

    $("#deleteAttendanceBtn").click(function() {
        deleteLastAttendance(currentStudent.id, currentGroup);
    });

    $("#viewHistoryBtn").click(function() {
        loadAttendanceHistory(currentStudent.id, currentGroup);
        $("#attendanceMenuOverlay").hide();
        $("#attendanceHistoryOverlay").fadeIn();
    });
}

// Función para cargar estudiantes de un grupo desde Firebase
function loadStudentsFromGroup(groupName) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        let groupKey = null;
        snapshot.forEach((groupSnapshot) => {
            if (groupSnapshot.val().name === groupName) {
                groupKey = groupSnapshot.key;
            }
        });

        if (!groupKey) {
            $("#studentsList").html("<p>Grupo no encontrado</p>");
            return;
        }

        const studentsRef = database.ref('users/' + user.uid + '/groups/' + groupKey + '/students');
        studentsRef.once('value', (studentsSnapshot) => {
            $("#studentsList").empty();
            if (!studentsSnapshot.exists()) {
                $("#studentsList").html("<p>No hay estudiantes en este grupo</p>");
                return;
            }
            
            studentsSnapshot.forEach((studentSnapshot) => {
                const student = studentSnapshot.val();
                $("#studentsList").append(`
                    <div class="name-item">
                        <span>${student.name}</span>
                        <button class="attendance-btn" data-student-id="${studentSnapshot.key}">Gestionar asistencia</button>
                    </div>
                `);
            });
        });
    });
}
// Función para crear datos de ejemplo
function createSampleGroupData(groupName) {
    const groupKey = database.ref('groups').push().key;
    
    const students = {
        "student1": {
            name: "Mortiz Javier Delgado",
            dni: "12345678"
        },
        "student2": {
            name: "Walter Alejandro White",
            dni: "87654321"
        },
        "student3": {
            name: "Alberto Bardales Ulises Quinto",
            dni: "45678123"
        }
    };
    
    const groupData = {
        name: groupName,
        students: students
    };
    
    database.ref('groups/' + groupKey).set(groupData).then(() => {
        loadStudentsFromGroup(groupName);
    }).catch((error) => {
        console.error("Error creando datos de ejemplo:", error);
    });
}

// Función para marcar asistencia
function markAttendance(studentId, studentName, groupName, status) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const now = new Date();
    const date = now.toLocaleDateString('es-ES');
    const timestamp = now.getTime();
    
    const attendanceRef = database.ref('users/' + user.uid + '/attendance/' + studentId).push();
    
    console.log("Guardando asistencia en:", attendanceRef.toString());
    
    attendanceRef.set({
        date: date,
        status: status,
        groupName: groupName,
        studentName: studentName,
        timestamp: timestamp
    }).then(() => {
        alert(`Asistencia: ${status} marcada para ${studentName}`);
        loadMainAttendanceHistory(); // Refresca la UI
    }).catch((error) => {
        console.error("Error detallado:", error);
        alert(`Error al registrar asistencia: ${error.message}`);
    });
}
// Función para eliminar la última asistencia
function deleteLastAttendance(studentId, groupName) {
    const attendanceRef = database.ref('attendance/' + studentId);
    
    // Obtener todas las asistencias ordenadas por timestamp
    attendanceRef.orderByChild('timestamp').limitToLast(1).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert("No hay asistencias registradas para eliminar");
            return;
        }
        
        // Encontrar la última asistencia del grupo especificado
        let lastAttendanceKey = null;
        snapshot.forEach((attendanceSnapshot) => {
            const attendance = attendanceSnapshot.val();
            if (attendance.groupName === groupName) {
                lastAttendanceKey = attendanceSnapshot.key;
            }
        });
        
        if (lastAttendanceKey) {
            // Eliminar la última asistencia
            attendanceRef.child(lastAttendanceKey).remove().then(() => {
                alert("Última asistencia eliminada correctamente");
            }).catch((error) => {
                alert("Error al eliminar asistencia: " + error.message);
            });
        } else {
            alert("No hay asistencias para este grupo");
        }
    }).catch((error) => {
        alert("Error al buscar asistencias: " + error.message);
    });
}

// Función para cargar el historial principal
function loadMainAttendanceHistory() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const attendanceRef = firebase.database().ref('users/' + user.uid + '/attendance');
    attendanceRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#mainHistoryBody").html(`<tr><td colspan="4">No hay asistencias registradas</td></tr>`);
            return;
        }

        $("#mainHistoryBody").empty();
        const allAttendances = [];
        snapshot.forEach((studentSnapshot) => {
            studentSnapshot.forEach((attendanceSnapshot) => {
                const attendance = attendanceSnapshot.val();
                allAttendances.push(attendance);
            });
        });

        // Ordenar por timestamp descendente (más reciente primero)
        allAttendances.sort((a, b) => b.timestamp - a.timestamp);
        const recentAttendances = allAttendances.slice(0, 20); // Mostrar solo los 20 más recientes

        if (recentAttendances.length === 0) {
            $("#mainHistoryBody").html(`<tr><td colspan="4">No hay registros recientes</td></tr>`);
        } else {
            recentAttendances.forEach((attendance) => {
                $("#mainHistoryBody").append(`
                    <tr>
                        <td>${attendance.date}</td>
                        <td>${attendance.groupName}</td>
                        <td>${attendance.studentName}</td>
                        <td style="${attendance.status === 'Presente' ? 'color:green;' : 'color:red;'}">${attendance.status}</td>
                    </tr>
                `);
            });
        }
    });
}

// Actualizar la estructura de la tabla en showAttendanceButtons
function showAttendanceButtons() {
    $(".main-content").html(`
        <div class='btn-container'>
            <button class='btn' id='history-btn'>Historial de asistencias</button>
            <button class='btn' id='mark-btn'>Marcar asistencia (DNI)</button>
        </div>
        <div class="attendance-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <button class="delete-history-btn">Borrar Historial</button>
            <h3>Historial de asistencias</h3>
            <p>Últimos registros</p>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Grupo</th>
                        <th>Estudiante</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="mainHistoryBody">
                    <tr><td colspan="4">Seleccione "Historial de asistencias" para cargar</td></tr>
                </tbody>
            </table>
        </div>
        <div class="mark-box" style="display: none;">
            <button class="back-btn">Regresar</button>
            <h3>Marcar asistencia</h3>
            <p>Ingrese su DNI</p>
            <input type="text" id="dniInput" placeholder="DNI">
            <button id="markAttendanceByDni">Marcar</button>
        </div>
    `);

    console.log("Attendance buttons shown in main-content");

    // Use event delegation for dynamically added buttons
    $(document).on("click", ".btn", function() {
        let action = $(this).text();
        console.log("Button clicked: ", action);
        $(".btn-container").hide();
        $(".back-btn").fadeIn();
        if (action === "Historial de asistencias") {
            $(".attendance-box").fadeIn();
            loadMainAttendanceHistory();
        } else if (action === "Marcar asistencia (DNI)") {
            $(".mark-box").fadeIn();
        }
    });

    // Event for marking attendance by DNI
    $("#markAttendanceByDni").click(function() {
        const dni = $("#dniInput").val().trim();
        if (!dni) {
            alert("Por favor ingrese un DNI");
            return;
        }
        markAttendanceByDni(dni);
    });

    // Event for returning to the main screen
    $(".back-btn").click(function() {
        $(".btn-container").fadeIn();
        $(".attendance-box, .mark-box").hide();
        $(".back-btn").hide();
    });

    // Event for deleting attendance history
    $(".delete-history-btn").click(function() {
        if (confirm("¿Estás seguro de que deseas borrar todo el historial de asistencias? Esta acción no se puede deshacer.")) {
            deleteAllAttendanceHistory();
        }
    });
}
function deleteAllAttendanceHistory() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado.");
        return;
    }

    const attendanceRef = database.ref('users/' + user.uid + '/attendance');
    attendanceRef.remove()
        .then(() => {
            alert("Historial de asistencias borrado correctamente.");
            loadMainAttendanceHistory(); // Refrescar la tabla de historial
        })
        .catch((error) => {
            alert("Error al borrar el historial: " + error.message);
        });
}
// Función para mostrar los botones de grupo actualizada
function showGroupButtons() {
    $(".main-content").html(`
        <h2>Mis Grupos</h2>
        <div class='group-box'>
            <button>911NYC - Desarrollo Python</button>
            <button>4632NC - Desarrollo Web</button>
            <button>L4D2 - Desarrollo de videojuegos</button>
        </div>
        <div class="group-overlay" id="groupOverlay">
            <button class="close-btn">X</button>
            <h3 id="groupTitle">911NYC - Desarrollo Python</h3>
            <div class="name-list" id="studentsList">
                <!-- Los estudiantes se cargarán dinámicamente -->
            </div>
        </div>
        <div class="attendance-menu-overlay" id="attendanceMenuOverlay">
            <button class="close-btn">X</button>
            <h3 id="studentName"></h3>
            <div class="attendance-menu-buttons">
                <button id="markPresentBtn">Marcar Presente</button>
                <button id="markAbsentBtn">Marcar Ausente</button>
                <button id="deleteAttendanceBtn">Eliminar asistencia</button>
                <button id="viewHistoryBtn">Ver historial</button>
            </div>
        </div>
        <div class="attendance-history-overlay" id="attendanceHistoryOverlay" style="display:none; position:absolute; width:80%; max-width:600px; background:#bbb; padding:20px; border-radius:10px; left:50%; top:50%; transform:translate(-50%, -50%); z-index:1002;">
            <button class="close-btn">X</button>
            <h3>Historial de Asistencias</h3>
            <h4 id="historyStudentName"></h4>
            <div id="attendanceHistory">
                <table style="width:100%; margin-top:40px; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="padding:10px; background:#888; color:white; border-radius:5px 0 0 5px;">Fecha</th>
                            <th style="padding:10px; background:#888; color:white; border-radius:0 5px 5px 0;">Estado</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceHistoryBody">
                        <!-- El historial se cargará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `);
    
    // Ocultar los overlays inicialmente
    $("#groupOverlay").hide();
    $("#attendanceMenuOverlay").hide();
    $("#attendanceHistoryOverlay").hide();

    // Cargar los estudiantes cuando se seleccione un grupo
    $(".group-box button").click(function() {
        let groupName = $(this).text();
        $("#groupTitle").text(groupName);
        
        // Guardamos el nombre del grupo seleccionado en una variable para usarlo después
        currentGroup = groupName;
        
        // Cargar los estudiantes del grupo desde Firebase
        loadStudentsFromGroup(groupName);
        
        $(".group-box").hide();
        $("#groupOverlay").fadeIn();
    });

    // Cerrar el overlay de grupo y volver a los botones originales
    $("#groupOverlay .close-btn").click(function() {
        $("#groupOverlay").hide();
        $(".group-box").fadeIn();
    });

    // Configurar evento delegado para los botones de asistencia
    $("#studentsList").on("click", ".attendance-btn", function() {
        let studentName = $(this).prev("span").text();
        let studentId = $(this).data("student-id");
        
        // Guardar el estudiante actual para usarlo en las funciones de asistencia
        currentStudent = {
            id: studentId,
            name: studentName
        };
        
        $("#studentName").text(studentName);
        $("#historyStudentName").text(studentName);
        $("#groupOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    // Cerrar el menú de asistencia y volver al overlay de grupo
    $("#attendanceMenuOverlay .close-btn").click(function() {
        $("#attendanceMenuOverlay").hide();
        $("#groupOverlay").fadeIn();
    });
    
    // Cerrar el historial de asistencias
    $("#attendanceHistoryOverlay .close-btn").click(function() {
        $("#attendanceHistoryOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    // Marcar asistencia como Presente
    $("#markPresentBtn").click(function() {
        markAttendance(currentStudent.id, currentStudent.name, currentGroup, "Presente");
    });
    
    // Marcar asistencia como Ausente
    $("#markAbsentBtn").click(function() {
        markAttendance(currentStudent.id, currentStudent.name, currentGroup, "Ausente");
    });

    // Eliminar última asistencia
    $("#deleteAttendanceBtn").click(function() {
        deleteLastAttendance(currentStudent.id, currentGroup);
    });

    // Ver historial de asistencias
    $("#viewHistoryBtn").click(function() {
        loadAttendanceHistory(currentStudent.id, currentGroup);
        $("#attendanceMenuOverlay").hide();
        $("#attendanceHistoryOverlay").fadeIn();
    });
}

// Función para cargar el historial de asistencias con opción de eliminar
function loadAttendanceHistory(studentId, groupName) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const attendanceRef = database.ref('users/' + user.uid + '/attendance/' + studentId);
    
    $("#attendanceHistoryBody").empty();
    
    attendanceRef.orderByChild('timestamp').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#attendanceHistoryBody").html(`<tr><td colspan="3">No hay asistencias registradas</td></tr>`);
            return;
        }
        
        const attendances = [];
        
        snapshot.forEach((attendanceSnapshot) => {
            const attendance = attendanceSnapshot.val();
            if (attendance.groupName === groupName) {
                attendances.push({
                    key: attendanceSnapshot.key,
                    ...attendance
                });
            }
        });
        
        attendances.sort((a, b) => b.timestamp - a.timestamp);
        
        if (attendances.length === 0) {
            $("#attendanceHistoryBody").html(`<tr><td colspan="3">No hay asistencias para este grupo</td></tr>`);
            return;
        }
        
        $("#attendanceHistoryOverlay table thead tr").html(`
            <th style="padding:10px; background:#888; color:white; border-radius:5px 0 0 5px;">Fecha</th>
            <th style="padding:10px; background:#888; color:white;">Estado</th>
            <th style="padding:10px; background:#888; color:white; border-radius:0 5px 5px 0;">Acciones</th>
        `);
        
        attendances.forEach((attendance) => {
            $("#attendanceHistoryBody").append(`
                <tr class="attendance-item">
                    <td style="padding:10px; background:white; color: black; text border-radius:5px 0 0 5px;">${attendance.date}</td>
                    <td style="padding:10px; background:white; ${attendance.status === 'Presente' ? 'color:green;' : 'color:red;'}">${attendance.status}</td>
                    <td style="padding:10px; background:white; border-radius:0 5px 5px 0;">
                        <button class="delete-attendance-btn" data-attendance-key="${attendance.key}">Eliminar</button>
                    </td>
                </tr>
            `);
        });
        
        $(".delete-attendance-btn").off('click').on('click', function() {
            const attendanceKey = $(this).data("attendance-key");
            deleteAttendance(studentId, attendanceKey, groupName);
        });
    }).catch((error) => {
        console.error("Error cargando historial:", error);
        $("#attendanceHistoryBody").html(`<tr><td colspan="3">Error al cargar historial: ${error.message}</td></tr>`);
    });
}

// Función para cargar la lista de estudiantes para eliminar o mover
function loadStudentListForDeletion() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        $("#student-list").html("<p>No hay usuario autenticado</p>");
        return;
    }

    $("#student-list").empty();

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#student-list").html("<p>No hay grupos registrados</p>");
            return;
        }

        let studentFound = false;
        
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const group = groupSnapshot.val();
            const groupName = group.name || 'Grupo sin nombre';
            
            // Verificar si el grupo tiene estudiantes
            if (group.students) {
                // Añadir encabezado del grupo
                $("#student-list").append(`<h5 class="group-header">${groupName}</h5>`);
                
                // Recorrer los estudiantes del grupo
                Object.keys(group.students).forEach((studentId) => {
                    const student = group.students[studentId];
                    studentFound = true;
                    
                    $("#student-list").append(`
                        <div class="student-item">
                            <span>${student.name} (DNI: ${student.dni || 'No registrado'})</span>
                            <div class="student-actions">
                                <button class="delete-student-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Eliminar
                                </button>
                                <button class="change-group-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Editar Estudiante 
                                </button>
                            </div>
                        </div>
                    `);
                });
            }
        });
        
        if (!studentFound) {
            $("#student-list").html("<p>No hay estudiantes registrados en ningún grupo</p>");
        }
        
        // Configurar eventos para los botones
        $(".delete-student-btn").click(function() {
            const groupKey = $(this).data("group-key");
            const studentId = $(this).data("student-id");
            const studentName = $(this).data("student-name");
            
            if (confirm(`¿Estás seguro de que deseas eliminar a ${studentName}?`)) {
                deleteStudent(groupKey, studentId, studentName);
            }
        });
        
        $(".change-group-btn").click(function() {
            const groupKey = $(this).data("group-key");
            const studentId = $(this).data("student-id");
            showChangeGroupForm(groupKey, studentId);
        });
    }).catch((error) => {
        console.error("Error al cargar estudiantes:", error);
        $("#student-list").html("<p>Error al cargar estudiantes: " + error.message + "</p>");
    });
}

// Función para eliminar un estudiante
function deleteStudent(groupKey, studentId, studentName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }
    
    // Eliminar al estudiante del grupo
    database.ref(`users/${user.uid}/groups/${groupKey}/students/${studentId}`).remove()
        .then(() => {
            // Eliminar los registros de asistencia del estudiante
            return database.ref(`users/${user.uid}/attendance/${studentId}`).remove();
        })
        .then(() => {
            alert(`Estudiante ${studentName} eliminado correctamente, junto con sus registros de asistencia.`);
            loadStudentListForDeletion(); // Recargar la lista de estudiantes
        })
        .catch((error) => {
            alert("Error al eliminar estudiante o registros de asistencia: " + error.message);
        });
}
// Función modificada para mostrar el formulario de cambio de grupo
// Función modificada para mostrar el formulario de cambio de grupo
function showChangeGroupForm(currentGroupKey, studentId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }

    database.ref(`users/${user.uid}/groups/${currentGroupKey}/students/${studentId}`).once('value', (snapshot) => {
        const student = snapshot.val();
        if (!student) {
            alert("No se pudo encontrar la información del estudiante");
            return;
        }

        let firstName = "";
        let lastName = "";
        if (student.name) {
            const nameParts = student.name.split(" ");
            if (nameParts.length > 1) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(" ");
            } else {
                firstName = student.name;
            }
        }

        const uniqueId = `change-${Date.now()}`;
        const changeGroupForm = `
            <div class="group-management-box change-group-form" id="${uniqueId}-form">
                <h4>Editar y Cambiar grupo</h4>
                <input type="text" class="form-input" id="${uniqueId}-firstName" value="${firstName}" placeholder="Nombre">
                <input type="text" class="form-input" id="${uniqueId}-lastName" value="${lastName}" placeholder="Apellido">
                <input type="text" class="form-input" id="${uniqueId}-dni" value="${student.dni || ''}" placeholder="DNI">
                <select class="form-select" id="${uniqueId}-group">
                    <option value="">Seleccionar nuevo grupo</option>
                </select>
                <button class="btn" id="${uniqueId}-submit">Guardar y Cambiar</button>
                <button class="btn" id="${uniqueId}-cancel">Cancelar</button>
            </div>
        `;

        $(`.student-item:has([data-student-id="${studentId}"])`).after(changeGroupForm);

        const groupSelect = $(`#${uniqueId}-group`);
        database.ref(`users/${user.uid}/groups`).once('value', (groupsSnapshot) => {
            groupsSnapshot.forEach((groupItem) => {
                const group = groupItem.val();
                const groupItemKey = groupItem.key;
                const selected = (groupItemKey === currentGroupKey) ? 'selected' : '';
                groupSelect.append(`<option value="${groupItemKey}" ${selected}>${group.name}</option>`);
            });
        });

        $(`#${uniqueId}-submit`).on('click', function() {
            const newGroupKey = $(`#${uniqueId}-group`).val();
            const updatedFirstName = $(`#${uniqueId}-firstName`).val().trim();
            const updatedLastName = $(`#${uniqueId}-lastName`).val().trim();
            const updatedDni = $(`#${uniqueId}-dni`).val().trim();

            if (!updatedFirstName) {
                alert("Por favor, completa al menos el nombre del estudiante");
                return;
            }

            if (!newGroupKey) {
                alert("Por favor selecciona un nuevo grupo");
                return;
            }

            $(`#${uniqueId}-submit`).text("Procesando...").prop("disabled", true);
            updateAndMoveStudent(currentGroupKey, newGroupKey, studentId, updatedFirstName, updatedLastName, updatedDni, uniqueId);
        });

        $(`#${uniqueId}-cancel`).on('click', function() {
            $(`#${uniqueId}-form`).remove();
        });
    });
}
function updateAndMoveStudent(currentGroupKey, newGroupKey, studentId, firstName, lastName, dni, formId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }

    // Crear el objeto actualizado del estudiante
    const updatedStudentData = {
        name: `${firstName} ${lastName}`.trim(),
        dni: dni
    };

    // Obtener referencia al estudiante actual
    const studentRef = database.ref(`users/${user.uid}/groups/${currentGroupKey}/students/${studentId}`);
    
    // Obtener referencia al nuevo grupo donde se moverá el estudiante
    const newStudentRef = database.ref(`users/${user.uid}/groups/${newGroupKey}/students`).push();
    
    // Primero crear el nuevo registro del estudiante en el nuevo grupo
    newStudentRef.set(updatedStudentData)
        .then(() => {
            // Después de crear el nuevo registro, eliminar el antiguo
            return studentRef.remove();
        })
        .then(() => {
            alert("Estudiante actualizado y cambiado de grupo correctamente");
            loadStudentListForDeletion();
            $(`#${formId}-form`).remove();
        })
        .catch((error) => {
            alert("Error al actualizar o cambiar el estudiante de grupo: " + error.message);
            $(`#${formId}-submit`).text("Guardar y Cambiar").prop("disabled", false);
        });
}
// Función para mover un estudiante a otro grupo
function moveStudentToGroup(currentGroupKey, newGroupKey, studentId, formId) {
    // Esta función ya no es necesaria porque updateAndMoveStudent ahora hace todo el trabajo
    // La mantenemos por compatibilidad, pero redirigimos a la nueva función
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }
    
    const studentRef = database.ref(`users/${user.uid}/groups/${currentGroupKey}/students/${studentId}`);
    
    studentRef.once('value', (snapshot) => {
        const studentData = snapshot.val();
        if (!studentData) {
            alert("No se pudo encontrar la información del estudiante");
            $(`#${formId}-submit`).text("Cambiar").prop("disabled", false);
            return;
        }
        
        // Si llegan a esta función, mantener los datos existentes
        const firstName = studentData.firstName || (studentData.name ? studentData.name.split(" ")[0] : "");
        const lastName = studentData.lastName || (studentData.name && studentData.name.split(" ").length > 1 ? 
                         studentData.name.split(" ").slice(1).join(" ") : "");
        const dni = studentData.dni || "";
        
        // Redirigir a la función principal
        updateAndMoveStudent(currentGroupKey, newGroupKey, studentId, firstName, lastName, dni, formId);
    });
}

// Función para cargar la lista de estudiantes para eliminar o mover
function loadStudentListForDeletion() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        $("#student-list").html("<p>No hay usuario autenticado</p>");
        return;
    }

    $("#student-list").empty();
    $("#student-list").html("<p>Cargando estudiantes...</p>");

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        $("#student-list").empty();
        
        if (!snapshot.exists()) {
            $("#student-list").html("<p>No hay grupos registrados</p>");
            return;
        }

        let studentFound = false;
        let processingCount = 0;
        
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const group = groupSnapshot.val();
            const groupName = group.name || 'Grupo sin nombre';
            
            // Verificar si el grupo tiene estudiantes
            if (group.students && Object.keys(group.students).length > 0) {
                // Añadir encabezado del grupo
                $("#student-list").append(`<h5 class="group-header">${groupName}</h5><div id="group-${groupKey}-students"></div>`);
                
                processingCount++;
                
                // Procesar estudiantes
                Object.keys(group.students).forEach((studentId) => {
                    const student = group.students[studentId];
                    studentFound = true;
                    
                    $(`#group-${groupKey}-students`).append(`
                        <div class="student-item">
                            <span>${student.name} (DNI: ${student.dni || 'No registrado'})</span>
                            <div class="student-actions">
                                <button class="delete-student-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Eliminar
                                </button>
                                <button class="change-group-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Editar Estudiante 
                                </button>
                            </div>
                        </div>
                    `);
                });
                
                processingCount--;
            }
        });
        
        if (processingCount <= 0) {
            if (!studentFound) {
                $("#student-list").html("<p>No hay estudiantes registrados en ningún grupo</p>");
            } else {
                // Configurar eventos para los botones
                $(".delete-student-btn").off("click").on("click", function() {
                    const groupKey = $(this).data("group-key");
                    const studentId = $(this).data("student-id");
                    const studentName = $(this).data("student-name");
                    
                    if (confirm(`¿Estás seguro de que deseas eliminar a ${studentName}?`)) {
                        deleteStudent(groupKey, studentId, studentName);
                    }
                });
                
                $(".change-group-btn").off("click").on("click", function() {
                    const groupKey = $(this).data("group-key");
                    const studentId = $(this).data("student-id");
                    showChangeGroupForm(groupKey, studentId);
                });
            }
        }
    }).catch((error) => {
        console.error("Error al cargar estudiantes:", error);
        $("#student-list").html("<p>Error al cargar estudiantes: " + error.message + "</p>");
    });
}
function loadStudentList() {
    // Code to load the list from the database
    database.ref('groups').once('value', (snapshot) => {
        let html = "";
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const students = groupSnapshot.val().students || {};
            Object.keys(students).forEach((studentId) => {
                const student = students[studentId];
                html += `
                    <div>
                        ${student.name} 
                        <button class="change-group" data-group="${groupKey}" data-student="${studentId}">
                            Change Group
                        </button>
                    </div>`;
            });
        });
        $("#student-list").html(html);

        // Bind the event to the button
        $(".change-group").click(function() {
            const groupKey = $(this).data("group");
            const studentId = $(this).data("student");
            showChangeGroupMenu(groupKey, studentId);
        });
    });
}
// Función para mostrar la gestión de grupos
function showGroupManagement() {
    $(".main-content").html(`
        <div class="group-management-box">
            <button class="back-btn">Regresar</button>
            <h3>Gestión de Grupos</h3>
            <div class="group-management-buttons">
                <button id="create-group-btn">Crear Grupo</button>
                <button id="edit-groups-btn">Editar Grupos</button>
            </div>
        </div>
        <div class="create-group-form" style="display:none;">
            <h4>Crear Nuevo Grupo</h4>
            <input type="text" id="group-code" placeholder="Código del Grupo (ej: 911NYC)">
            <input type="text" id="group-name" placeholder="Nombre del Curso (ej: Desarrollo Python)">
            <button id="submit-create-group">Crear Grupo</button>
            <button class="back-to-group-management">Cancelar</button>
        </div>
        <div class="edit-groups-list" style="display:none;">
            <h4>Editar o Eliminar Grupos</h4>
            <div id="groups-list">
                <!-- Lista de grupos se cargará aquí -->
            </div>
            <button class="back-to-group-management">Regresar</button>
        </div>
    `);

    $(".group-management-box").fadeIn();

    $("#create-group-btn").click(function() {
        $(".group-management-box").hide();
        $(".create-group-form").fadeIn();
    });

    $("#edit-groups-btn").click(function() {
        $(".group-management-box").hide();
        loadGroupsForEdit();
        $(".edit-groups-list").fadeIn();
    });

    $(".back-btn").click(function() {
        // Volver a la pantalla principal
        showAttendanceButtons();
    });

    $(".back-to-group-management").click(function() {
        // Volver a la gestión de grupos
        $(".create-group-form, .edit-groups-list").hide();
        $(".group-management-box").fadeIn();
    });

    $("#submit-create-group").click(function() {
        const groupCode = $("#group-code").val().trim();
        const groupName = $("#group-name").val().trim();
        
        if (!groupCode || !groupName) {
            alert("Por favor complete todos los campos");
            return;
        }
        
        const user = firebase.auth().currentUser;
        if (!user) return;
    
        const newGroupName = `${groupCode} - ${groupName}`;
        const groupsRef = firebase.database().ref('users/' + user.uid + '/groups');
        
        groupsRef.once('value', (snapshot) => {
            let groupExists = false;
            snapshot.forEach((groupSnapshot) => {
                if (groupSnapshot.val().name === newGroupName) {
                    groupExists = true;
                }
            });
    
            if (groupExists) {
                alert("Ya existe un grupo con este nombre");
                return;
            }
    
            const newGroupRef = groupsRef.push();
            newGroupRef.set({
                name: newGroupName,
                code: groupCode,
                courseName: groupName,
                creationDate: new Date().toISOString()
            }).then(() => {
                alert("Grupo creado correctamente");
            });
        });
    });
}

// Función para cargar y mostrar grupos para editar
function loadGroupsForEdit() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        $("#groups-list").html("<p>No hay usuario autenticado</p>");
        return;
    }

    $("#groups-list").empty();

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    
    groupsRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#groups-list").html("<p>No hay grupos registrados para tu cuenta</p>");
            return;
        }
        
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const group = groupSnapshot.val();
            
            let studentCount = 0;
            if (group.students) {
                studentCount = Object.keys(group.students).length;
            }
            
            $("#groups-list").append(`
                <div class="group-item" data-group-key="${groupKey}">
                    <div class="group-info">
                        <h5>${group.name || 'Grupo sin nombre'}</h5>
                        <p>Estudiantes: ${studentCount}</p>
                    </div>
                    <div class="group-actions">
                        <button class="edit-group-btn" data-group-key="${groupKey}" data-group-name="${group.name || ''}">
                            Editar
                        </button>
                        <button class="delete-group-btn" data-group-key="${groupKey}" data-group-name="${group.name || ''}" 
                            ${studentCount > 0 ? 'disabled' : ''}>
                            Eliminar
                        </button>
                    </div>
                </div>
            `);
        });
        
        // Usar eventos delegados para botones dinámicos
        $(document).off("click", ".edit-group-btn").on("click", ".edit-group-btn", function() {
            console.log("Botón Editar clicado para grupo:", $(this).data("group-key"), $(this).data("group-name"));
            const groupKey = $(this).data("group-key");
            const groupName = $(this).data("group-name");
            showEditGroupForm(groupKey, groupName);
        });
        
        $(document).off("click", ".delete-group-btn").on("click", ".delete-group-btn", function() {
            console.log("Botón Eliminar clicado para grupo:", $(this).data("group-key"), $(this).data("group-name"));
            const groupKey = $(this).data("group-key");
            const groupName = $(this).data("group-name");
            
            if ($(this).is(":disabled")) {
                alert("No se puede eliminar un grupo que contiene estudiantes");
                return;
            }
            
            showDeleteGroupConfirmation(groupKey, groupName); // Mostrar confirmación antes de eliminar
        });
    }).catch((error) => {
        console.error("Error al cargar grupos:", error);
        $("#groups-list").html("<p>Error al cargar grupos: " + error.message + "</p>");
    });
}

// Función para mostrar el formulario de edición de grupo
function showEditGroupForm(groupKey, groupName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }

    // Extraer code y courseName del nombre del grupo (formato: "code - courseName")
    const parts = groupName.split(" - ");
    const groupCode = parts[0] || '';
    const courseName = parts.slice(1).join(" - ") || '';

    // Crear el formulario de edición con un ID único basado en groupKey
    const editForm = `
        <div class="edit-group-form" id="edit-form-${groupKey}">
            <h4>Editar Grupo</h4>
            <input type="text" id="edit-group-code-${groupKey}" value="${groupCode}" placeholder="Código del Grupo">
            <input type="text" id="edit-group-name-${groupKey}" value="${courseName}" placeholder="Nombre del Curso">
            <button class="submit-edit-group" data-group-key="${groupKey}">Guardar</button>
            <button class="cancel-edit-group">Cancelar</button>
        </div>
    `;

    // Añadir el formulario después del grupo correspondiente
    $(`.group-item[data-group-key="${groupKey}"]`).closest(".group-item").after(editForm).hide();

    // Eventos para los botones del formulario
    $(document).off("click", `.submit-edit-group[data-group-key="${groupKey}"]`).on("click", `.submit-edit-group[data-group-key="${groupKey}"]`, function() {
        const key = $(this).data("group-key");
        const newCode = $(`#edit-group-code-${key}`).val().trim();
        const newName = $(`#edit-group-name-${key}`).val().trim();
        
        if (!newCode || !newName) {
            alert("Por favor, completa todos los campos");
            return;
        }
        
        updateGroup(key, newCode, newName);
    });

    $(document).off("click", `.cancel-edit-group`).on("click", `.cancel-edit-group`, function() {
        $(`#edit-form-${groupKey}`).remove();
        $(`.group-item[data-group-key="${groupKey}"]`).show();
    });
}

// Función para actualizar un grupo en la base de datos
function updateGroup(groupKey, newCode, newName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }

    const newGroupName = `${newCode} - ${newName}`;

    // Verificar si ya existe otro grupo con el mismo nombre para este usuario
    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        let groupExists = false;
        snapshot.forEach((groupSnapshot) => {
            if (groupSnapshot.key !== groupKey && groupSnapshot.val().name === newGroupName) {
                groupExists = true;
            }
        });

        if (groupExists) {
            alert("Ya existe otro grupo con este código y nombre para tu cuenta");
            return;
        }

        // Actualizar el grupo en la base de datos
        database.ref(`users/${user.uid}/groups/${groupKey}`).update({
            name: newGroupName,
            code: newCode,
            courseName: newName,
            lastUpdated: new Date().toISOString()
        }).then(() => {
            alert("Grupo actualizado correctamente");
            // Actualizar la interfaz
            loadGroupsForEdit(); // Recargar la lista de grupos
            $(`#edit-form-${groupKey}`).remove();
            $(`.group-item[data-group-key="${groupKey}"]`).show();
        }).catch((error) => {
            alert("Error al actualizar grupo: " + error.message);
        });
    });
}

// Función para actualizar las asistencias tras cambiar el nombre de un grupo
function updateAttendancesForGroup(groupKey, newGroupName) {
    // Primero obtenemos el nombre antiguo del grupo
    database.ref(`groups/${groupKey}`).once('value', (groupSnapshot) => {
        const oldGroupName = groupSnapshot.val().name;
        
        // Ahora actualizamos todas las asistencias que usan ese nombre de grupo
        database.ref('attendance').once('value', (snapshot) => {
            snapshot.forEach((studentSnapshot) => {
                const studentId = studentSnapshot.key;
                
                studentSnapshot.forEach((attendanceSnapshot) => {
                    const attendance = attendanceSnapshot.val();
                    const attendanceKey = attendanceSnapshot.key;
                    
                    if (attendance.groupName === oldGroupName) {
                        // Actualizar esta asistencia con el nuevo nombre de grupo
                        database.ref(`attendance/${studentId}/${attendanceKey}`).update({
                            groupName: newGroupName
                        });
                    }
                });
            });
        });
    });
}

// Función para eliminar un grupo
// Función para eliminar un grupo
function deleteGroup(groupKey, groupName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        return;
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar el grupo "${groupName}"?`)) {
        database.ref(`users/${user.uid}/groups/${groupKey}`).remove()
            .then(() => {
                alert("Grupo eliminado correctamente");
                loadGroupsForEdit();
            })
            .catch((error) => {
                alert("Error al eliminar grupo: " + error.message);
            });
    }
}
// Función para mostrar confirmación de eliminación de grupo
function showDeleteGroupConfirmation(groupKey, groupName) {
    if (confirm(`¿Estás seguro de que deseas eliminar el grupo "${groupName}"?`)) {
        deleteGroup(groupKey, groupName);
    }
}
// Actualizar la barra lateral para incluir la gestión de grupos
function updateSidebar() {
    $(".sidebar").html(`
        <h2>Menu</h2>
        <button>Gestionar asistencia</button>
        <button>Grupos a cargo</button>
        <button>Gestionar estudiantes</button>
        <button>Gestionar grupos</button>
        <button>Info de cuenta</button> <!-- Nuevo botón -->
        <button id="logoutButton" class="botonLogout">Cerrar Sesión</button>
    `);
    
$(".sidebar button").click(function() {
    let action = $(this).text();
    if (action === "Gestionar asistencia") {
        showAttendanceButtons();
        } else if (action === "Grupos a cargo") {
            showGroupButtons();
        } else if (action === "Gestionar estudiantes") {
            showStudentManagement();
        } else if (action === "Gestionar grupos") {
            showGroupManagement();
        } else if (action === "Info de cuenta") {
            showAccountInfo(); // Nueva función para mostrar info
        } else if (action === "Cerrar Sesión") {
            auth.signOut()
                .then(() => {
                    alert('Sesión cerrada correctamente');
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    alert('Error al cerrar sesión: ' + error.message);
                });
        }
    });
}
function showAccountInfo() {
    const user = auth.currentUser;
    if (!user) {
        alert("No hay usuario autenticado");
        return;
    }
    
    const userRef = database.ref('users/' + user.uid);
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            $(".main-content").html(`
                <div class="account-info-box">
                    <button class="back-btn">Regresar</button>
                    <h3>Información de la cuenta</h3>
                    <p><strong>Nombre:</strong> ${userData.nombre}</p>
                    <p><strong>Apellido:</strong> ${userData.apellido}</p>
                    <p><strong>Email:</strong> ${userData.email}</p>
                    <p><strong>Fecha de Registro:</strong> ${new Date(userData.fechaRegistro).toLocaleDateString()}</p>
                </div>
            `);
            
            // Evento para el botón "Regresar"
            $(".back-btn").click(function() {
                showAttendanceButtons(); // Volver a la pantalla principal
            });
        } else {
            alert("No se encontró información del usuario");
        }
    }).catch((error) => {
        alert("Error al cargar información del usuario: " + error.message);
    });
}
// Modificar la función showGroupButtons para cargar grupos dinámicamente
function showGroupButtons() {
    $(".main-content").html(`
        <h2>Mis Grupos</h2>
        <div class='group-box' id="dynamic-group-box">
            <!-- Los grupos se cargarán dinámicamente aquí -->
            <p>Cargando grupos...</p>
        </div>
        <div class="group-overlay" id="groupOverlay">
            <button class="close-btn">X</button>
            <h3 id="groupTitle"></h3>
            <div class="name-list" id="studentsList">
                <!-- Los estudiantes se cargarán dinámicamente -->
            </div>
        </div>
        <div class="attendance-menu-overlay" id="attendanceMenuOverlay">
            <button class="close-btn">X</button>
            <h3 id="studentName"></h3>
            <div class="attendance-menu-buttons">
                <button id="markPresentBtn">Marcar Presente</button>
                <button id="markAbsentBtn">Marcar Ausente</button>
                <button id="deleteAttendanceBtn">Eliminar asistencia</button>
                <button id="viewHistoryBtn">Ver historial</button>
            </div>
        </div>
        <div class="attendance-history-overlay" id="attendanceHistoryOverlay" style="display:none; position:absolute; width:80%; max-width:600px; background:#bbb; padding:20px; border-radius:10px; left:50%; top:50%; transform:translate(-50%, -50%); z-index:1002;">
            <button class="close-btn">X</button>
            <h3>Historial de Asistencias</h3>
            <h4 id="historyStudentName"></h4>
            <div id="attendanceHistory">
                <table style="width:100%; margin-top:40px; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="padding:10px; background:#888; color:white; border-radius:5px 0 0 5px;">Fecha</th>
                            <th style="padding:10px; background:#888; color:white; border-radius:0 5px 5px 0;">Estado</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceHistoryBody">
                        <!-- El historial se cargará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `);
    
    // Cargar grupos dinámicamente
    loadGroups();
    
    // Ocultar los overlays inicialmente
    $("#groupOverlay").hide();
    $("#attendanceMenuOverlay").hide();
    $("#attendanceHistoryOverlay").hide();

    // Evento delegado para los botones de grupo
    $("#dynamic-group-box").on("click", "button", function() {
        let groupName = $(this).text();
        $("#groupTitle").text(groupName);
        
        // Guardamos el nombre del grupo seleccionado
        currentGroup = groupName;
        
        // Cargar los estudiantes del grupo
        loadStudentsFromGroup(groupName);
        
        $("#dynamic-group-box").hide();
        $("#groupOverlay").fadeIn();
    });

    // Resto de los eventos
    $("#groupOverlay .close-btn").click(function() {
        $("#groupOverlay").hide();
        $("#dynamic-group-box").fadeIn();
    });

    $("#studentsList").on("click", ".attendance-btn", function() {
        let studentName = $(this).prev("span").text();
        let studentId = $(this).data("student-id");
        
        currentStudent = {
            id: studentId,
            name: studentName
        };
        
        $("#studentName").text(studentName);
        $("#historyStudentName").text(studentName);
        $("#groupOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    $("#attendanceMenuOverlay .close-btn").click(function() {
        $("#attendanceMenuOverlay").hide();
        $("#groupOverlay").fadeIn();
    });
    
    $("#attendanceHistoryOverlay .close-btn").click(function() {
        $("#attendanceHistoryOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn();
    });

    $("#markPresentBtn").click(function() {
        markAttendance(currentStudent.id, currentStudent.name, currentGroup, "Presente");
    });
    
    $("#markAbsentBtn").click(function() {
        markAttendance(currentStudent.id, currentStudent.name, currentGroup, "Ausente");
    });

    $("#deleteAttendanceBtn").click(function() {
        deleteLastAttendance(currentStudent.id, currentGroup);
    });

    $("#viewHistoryBtn").click(function() {
        loadAttendanceHistory(currentStudent.id, currentGroup);
        $("#attendanceMenuOverlay").hide();
        $("#attendanceHistoryOverlay").fadeIn();
    });
}

// Función para cargar grupos desde Firebase
function loadGroups() {
    const user = firebase.auth().currentUser; // Obtener usuario autenticado
    if (!user) return;

    const groupsRef = firebase.database().ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            $("#dynamic-group-box").html("<p>No hay grupos registrados</p>");
            return;
        }
        
        $("#dynamic-group-box").empty();
        snapshot.forEach((groupSnapshot) => {
            const group = groupSnapshot.val();
            $("#dynamic-group-box").append(`
                <button>${group.name}</button>
            `);
        });
    }).catch((error) => {
        console.error("Error cargando grupos:", error);
    });
}

// Actualizar la función showStudentManagement para seleccionar grupos dinámicamente
function showStudentManagement() {
    $(".main-content").html(`
        <div class="student-management-box">
            <button class="back-btn">Regresar</button>
            <h3>Gestionar Estudiantes</h3>
            <div class="student-management-buttons">
                <button id="add-student-btn">Agregar</button>
                <button id="delete-student-btn">Editar</button>
            </div>
        </div>
        <div class="add-student-form" style="display:none;">
            <h4>Agregar Nuevo Estudiante</h4>
            <input type="text" id="student-name" placeholder="Nombre">
            <input type="text" id="student-surname" placeholder="Apellido">
            <select id="student-group">
                <option value="">Seleccionar Grupo</option>
                <!-- Grupos se cargarán dinámicamente -->
            </select>
            <input type="text" id="student-dni" placeholder="DNI">
            <button id="submit-add-student">Agregar</button>
            <button class="back-to-student-management">Cancelar</button>
        </div>
        <div class="delete-student-list" style="display:none;">
            <h4>Editar Estudiantes</h4>
            <div id="student-list">
                <!-- Lista de estudiantes se cargará aquí -->
            </div>
            <button class="back-to-student-management">Regresar</button>
        </div>
    `);

    $(".student-management-box").fadeIn();

    // Cargar la lista de grupos en el select
    loadGroupsForSelect();

    $("#add-student-btn").click(function() {
        $(".student-management-box").hide();
        $(".add-student-form").fadeIn();
    });

    $("#delete-student-btn").click(function() {
        $(".student-management-box").hide();
        loadStudentListForDeletion();
        $(".delete-student-list").fadeIn();
    });

    $(".back-btn").click(function() {
        showAttendanceButtons();
    });

    $(".back-to-student-management").click(function() {
        $(".add-student-form, .delete-student-list").hide();
        $(".student-management-box").fadeIn();
    });

$("#submit-add-student").click(function() {
    const name = $("#student-name").val().trim();
    const surname = $("#student-surname").val().trim();
    const groupKey = $("#student-group").val(); // Esto debe ser el ID del grupo, no el nombre
    const dni = $("#student-dni").val().trim();

    if (!name || !surname || !groupKey || !dni) {
        alert("Por favor complete todos los campos");
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) return;

    const newStudentRef = database.ref('users/' + user.uid + '/groups/' + groupKey + '/students').push();
    newStudentRef.set({
        name: name + " " + surname,
        dni: dni
    }).then(() => {
        alert("Estudiante agregado correctamente");
        $("#student-name").val("");
        $("#student-surname").val("");
        $("#student-dni").val("");
    }).catch((error) => {
        alert("Error al agregar estudiante: " + error.message);
    });
});
}

// Función para cargar grupos en un select
function loadGroupsForSelect() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const groupsRef = firebase.database().ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        const select = $("#student-group");
        select.empty();
        select.append('<option value="">Seleccionar Grupo</option>');
        snapshot.forEach((groupSnapshot) => {
            const group = groupSnapshot.val();
            select.append(`<option value="${groupSnapshot.key}">${group.name}</option>`);
        });
    });
}

// Función modificada para mostrar el formulario de cambio de grupo
// Función modificada para mostrar el formulario de cambio de grupo


// Función para mover un estudiante a otro grupo

// Función para cargar la lista de estudiantes para eliminar o mover
function loadStudentListForDeletion() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("No hay usuario autenticado. Por favor, inicia sesión.");
        $("#student-list").html("<p>No hay usuario autenticado</p>");
        return;
    }

    $("#student-list").empty();
    $("#student-list").html("<p>Cargando estudiantes...</p>");

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        $("#student-list").empty();
        
        if (!snapshot.exists()) {
            $("#student-list").html("<p>No hay grupos registrados</p>");
            return;
        }

        let studentFound = false;
        let processingCount = 0;
        
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const group = groupSnapshot.val();
            const groupName = group.name || 'Grupo sin nombre';
            
            // Verificar si el grupo tiene estudiantes
            if (group.students && Object.keys(group.students).length > 0) {
                // Añadir encabezado del grupo
                $("#student-list").append(`<h5 class="group-header">${groupName}</h5><div id="group-${groupKey}-students"></div>`);
                
                processingCount++;
                
                // Procesar estudiantes
                Object.keys(group.students).forEach((studentId) => {
                    const student = group.students[studentId];
                    studentFound = true;
                    
                    $(`#group-${groupKey}-students`).append(`
                        <div class="student-item">
                            <span>${student.name} (DNI: ${student.dni || 'No registrado'})</span>
                            <div class="student-actions">
                                <button class="delete-student-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Eliminar
                                </button>
                                <button class="change-group-btn" 
                                    data-group-key="${groupKey}" 
                                    data-student-id="${studentId}" 
                                    data-student-name="${student.name}">
                                    Editar Estudiante 
                                </button>
                            </div>
                        </div>
                    `);
                });
                
                processingCount--;
            }
        });
        
        if (processingCount <= 0) {
            if (!studentFound) {
                $("#student-list").html("<p>No hay estudiantes registrados en ningún grupo</p>");
            } else {
                // Configurar eventos para los botones
                $(".delete-student-btn").off("click").on("click", function() {
                    const groupKey = $(this).data("group-key");
                    const studentId = $(this).data("student-id");
                    const studentName = $(this).data("student-name");
                    
                    if (confirm(`¿Estás seguro de que deseas eliminar a ${studentName}?`)) {
                        deleteStudent(groupKey, studentId, studentName);
                    }
                });
                
                $(".change-group-btn").off("click").on("click", function() {
                    const groupKey = $(this).data("group-key");
                    const studentId = $(this).data("student-id");
                    showChangeGroupForm(groupKey, studentId);
                });
            }
        }
    }).catch((error) => {
        console.error("Error al cargar estudiantes:", error);
        $("#student-list").html("<p>Error al cargar estudiantes: " + error.message + "</p>");
    });
}

// Modificar la función init o $(document).ready() para actualizar la barra lateral
$(document).ready(function() {
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('Usuario autenticado:', user);
            const userRef = database.ref('users/' + user.uid);
            userRef.once('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    $("#userName").text(userData.nombre);
                    $("#userLastName").text(userData.apellido);
                    $("#userEmail").text(userData.email);
                    $("#userDate").text(new Date(userData.fechaRegistro).toLocaleDateString());
                    // Actualizar la barra lateral con la nueva opción
                    updateSidebar();
                    // Redirigir a la página principal si no estamos en ella
                    redirectToDashboard();
                }
            });
        } else {
            // Redirigir a index.html solo si no estamos ya en ella
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });

    $("#profileIcon").click(function() {
        $("#profileMenu").toggle();
    });

    $("#logoutButton").click(function() {
        auth.signOut()
            .then(() => {
                alert('Sesión cerrada correctamente');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                alert('Error al cerrar sesión: ' + error.message);
            });
    });

    // Si ya estamos autenticados, actualizar la barra lateral
    if (auth.currentUser) {
        updateSidebar();
    }
});
// Función para eliminar una asistencia específica
function deleteAttendance(studentId, attendanceKey, groupName) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const attendanceRef = database.ref('users/' + user.uid + '/attendance/' + studentId + '/' + attendanceKey);
    
    attendanceRef.remove().then(() => {
        alert("Asistencia eliminada correctamente");
        // Recargar el historial
        loadAttendanceHistory(studentId, groupName);
    }).catch((error) => {
        alert("Error al eliminar asistencia: " + error.message);
    });
}

// Función para eliminar la última asistencia
function deleteLastAttendance(studentId, groupName) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const attendanceRef = database.ref('users/' + user.uid + '/attendance/' + studentId);
    
    // Obtener todas las asistencias ordenadas por timestamp
    attendanceRef.orderByChild('timestamp').limitToLast(1).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert("No hay asistencias registradas para eliminar");
            return;
        }
        
        // Encontrar la última asistencia del grupo especificado
        let lastAttendanceKey = null;
        snapshot.forEach((attendanceSnapshot) => {
            const attendance = attendanceSnapshot.val();
            if (attendance.groupName === groupName) {
                lastAttendanceKey = attendanceSnapshot.key;
            }
        });
        
        if (lastAttendanceKey) {
            // Eliminar la última asistencia
            attendanceRef.child(lastAttendanceKey).remove().then(() => {
                alert("Última asistencia eliminada correctamente");
            }).catch((error) => {
                alert("Error al eliminar asistencia: " + error.message);
            });
        } else {
            alert("No hay asistencias para este grupo");
        }
    }).catch((error) => {
        alert("Error al buscar asistencias: " + error.message);
    });
}
