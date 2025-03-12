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







// Función para marcar asistencia por DNI
function markAttendanceByDni(dni) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification("No hay usuario autenticado. Por favor, inicia sesión.", "error");
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
            showNotification("No se encontró ningún estudiante con ese DNI en tus grupos", "error");
        }
    }).catch((error) => {
        showNotification("Error al buscar estudiante: " + error.message, "error");
    });
}

// Función de notificación que desaparece a los 3 segundos (sin botón de cierre)
function showNotification(message, type = 'info') {
    // Crear el elemento de notificación (sin botón de cierre)
    const notification = $(`<div class="notification ${type}">
        <span class="message">${message}</span>
    </div>`);
    
    // Añadir al DOM
    $("body").append(notification);
    
    // Mostrar con animación
    notification.addClass('show');
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        notification.removeClass('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


// Mostrar botones de grupo
// Función para cargar estudiantes de un grupo desde Firebase
function loadStudentsFromGroup(groupName) {
    $("#studentsList").empty().html('<p class="loading-message">Cargando estudiantes...</p>');
    
    const userId = firebase.auth().currentUser.uid;
    if (!userId) return;
    
    const groupsRef = firebase.database().ref('users/' + userId + '/groups');
    
    groupsRef.once('value').then((snapshot) => {
        let groupKey = null;
        
        // Find the group key based on the group name
        snapshot.forEach((groupSnapshot) => {
            if (groupSnapshot.val().name === groupName) {
                groupKey = groupSnapshot.key;
            }
        });
        
        if (!groupKey) {
            $("#studentsList").html("<p>Grupo no encontrado</p>");
            return;
        }
        
        // Now use that key to get the students
        const studentsRef = firebase.database().ref('users/' + userId + '/groups/' + groupKey + '/students');
        
        studentsRef.once('value').then((studentsSnapshot) => {
            $("#studentsList").empty();
            
            if (!studentsSnapshot.exists() || studentsSnapshot.numChildren() === 0) {
                $("#studentsList").html('<p class="loading-message">No hay estudiantes en este grupo</p>');
                return;
            }
            
            let index = 0;
            studentsSnapshot.forEach((childSnapshot) => {
                const studentId = childSnapshot.key;
                const studentData = childSnapshot.val();
                const studentName = studentData.name || 'Estudiante sin nombre';
                
                // Create element with animation delay
                const studentElement = `
                    <div class="student-item" style="animation-delay: ${index * 0.05}s">
                        <span class="student-name">${studentName}</span>
                        <button class="attendance-btn" data-student-id="${studentId}">
                            <i class="fas fa-clipboard-check"></i> Asistencia
                        </button>
                    </div>
                `;
                
                $("#studentsList").append(studentElement);
                index++;
            });
            
            // Adjuntar evento a los botones de asistencia después de agregarlos al DOM
            $("#studentsList").on("click", ".attendance-btn", function() {
                let studentName = $(this).prev(".student-name").text();
                let studentId = $(this).data("student-id");
                
                // Guardar referencia al estudiante actual
                currentStudent = {
                    id: studentId,
                    name: studentName
                };
                
                // Actualizar el título en el menú de asistencia
                $("#studentName").text(studentName);
                $("#historyStudentName").text(studentName);
                
                // Mostrar el menú de asistencia
                $("#groupOverlay").fadeOut(300, function() {
                    $("#attendanceMenuOverlay").fadeIn(300);
                });
            });
            
        }).catch((error) => {
            console.error("Error loading students:", error);
            $("#studentsList").html('<p class="loading-message">Error al cargar estudiantes</p>');
        });
    }).catch((error) => {
        console.error("Error finding group:", error);
        $("#studentsList").html('<p class="loading-message">Error al buscar el grupo</p>');
    });
    
    // Añadir funcionalidad al botón de cierre
    $("#groupOverlay .close-btn").off("click").on("click", function() {
        $("#groupOverlay").fadeOut(300, function() {
            $(".groups-management-box").fadeIn(300);
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
    if (!user) {
        showNotification("No hay usuario autenticado", "error");
        return;
    }
    
    // Obtener fecha actual en formato legible
    const now = new Date();
    const date = now.toLocaleDateString();
    const timestamp = now.getTime();
    
    // Referencia a la base de datos para asistencias
    const attendanceRef = database.ref('users/' + user.uid + '/attendance/' + studentId).push();
    
    // Guardar la asistencia
    attendanceRef.set({
        date: date,
        status: status,
        groupName: groupName,
        timestamp: timestamp,
        studentName: studentName // Add the student name to the attendance record
    }).then(() => {
        showNotification(`Asistencia de ${studentName} marcada como ${status}`, "success");
    }).catch((error) => {
        showNotification("Error al marcar asistencia: " + error.message, "error");
    });
}
function moveStudentToGroup(studentId, currentGroupKey, newGroupKey, newName, newDni) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Obtener datos actuales del estudiante
    database.ref(`users/${user.uid}/groups/${currentGroupKey}/students/${studentId}`).once('value', (snapshot) => {
        const studentData = snapshot.val() || {};
        
        // Crear objeto con datos actualizados
        const updatedStudentData = {
            name: newName || studentData.name,
            dni: newDni || studentData.dni
        };
        
        // Agregar al nuevo grupo
        database.ref(`users/${user.uid}/groups/${newGroupKey}/students/${studentId}`).set(updatedStudentData)
            .then(() => {
                // Eliminar del grupo anterior
                return database.ref(`users/${user.uid}/groups/${currentGroupKey}/students/${studentId}`).remove();
            })
            .then(() => {
                showNotification("Estudiante movido correctamente", "success");
                $(".edit-student-form").remove();
                loadStudentListForDeletion();
                $(".delete-student-list").fadeIn();
            })
            .catch((error) => {
                showNotification("Error al mover estudiante: " + error.message, "error");
            });
    });
}
// Asegúrate de que esta función esté disponible en tu código
function showNotification(message, type = 'info') {
    // Crear el elemento de notificación (sin botón de cierre)
    const notification = $(`<div class="notification ${type}">
        <span class="message">${message}</span>
    </div>`);
    
    // Añadir al DOM
    $("body").append(notification);
    
    // Mostrar con animación
    notification.addClass('show');
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        notification.removeClass('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
        <div class="attendance-management-box glass-effect">
            <h3>Gestión de Asistencia</h3>
            <div class="attendance-buttons-container">
                <button data-action="history">Historial de asistencias</button>
                <button data-action="mark-attendance-by-dni">Marcar asistencia (DNI)</button>
            </div>
        </div>
        <div class="attendance-box glass-effect" style="display: none;">
            <button class="back-btn">Volver</button>
            <button class="delete-history-btn">Borrar Historial</button>
            <h3 class="student-history-title">Historial de asistencias</h3>
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
        <div class="mark-box glass-effect" style="display: none;">
            <button class="back-btn">Volver</button>
            <h3>Marcar asistencia</h3>
            <p>Ingrese su DNI</p>
            <input type="text" id="dniInput" placeholder="DNI">
            <button id="markAttendanceByDni">Marcar</button>
        </div>
    `);

    console.log("Attendance buttons shown in main-content");

    // Use event delegation for dynamically added buttons
    $(document).on("click", "[data-action]", function() {
        let action = $(this).attr("data-action");
        console.log("Button clicked: ", action);
        $(".attendance-management-box").hide();
        
        if (action === "history") {
            $(".attendance-box").fadeIn();
            loadMainAttendanceHistory();
        } else if (action === "mark-attendance-by-dni") {
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
        $(".attendance-management-box").fadeIn();
        $(".attendance-box, .mark-box").hide();
    });

    // Event for deleting attendance history
    $(".delete-history-btn").click(function() {
        // Reemplazar confirm() con nuestro diálogo personalizado
        showCustomConfirmation(
            "¿Estás seguro de que deseas borrar todo el historial de asistencias? Esta acción no se puede deshacer.",
            () => {
                // Si confirma, ejecuta la eliminación
                deleteAllAttendanceHistory();
            },
            () => {
                // Si cancela, no hace nada
                console.log("Eliminación de historial cancelada");
            }
        );
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
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
        `);
        
        attendances.forEach((attendance) => {
            const statusClass = attendance.status === 'Presente' ? 'status-present' : 'status-absent';
            
            $("#attendanceHistoryBody").append(`
                <tr class="attendance-item">
                    <td>${attendance.date}</td>
                    <td class="${statusClass}">${attendance.status}</td>
                    <td>
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



// Función para eliminar un estudiante
function deleteStudent(groupKey, studentId, studentName) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    database.ref(`users/${user.uid}/groups/${groupKey}/students/${studentId}`).remove()
        .then(() => {
            showNotification(`Estudiante ${studentName} eliminado correctamente`, "success");
            loadStudentListForDeletion();
        })
        .catch((error) => {
            showNotification("Error al eliminar estudiante: " + error.message, "error");
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
            showNotification("Por favor complete todos los campos", "error");
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
                showNotification("Ya existe un grupo con este nombre", "error");
                return;
            }
    
            const newGroupRef = groupsRef.push();
            newGroupRef.set({
                name: newGroupName,
                code: groupCode,
                courseName: groupName,
                creationDate: new Date().toISOString()
            }).then(() => {
                // Limpiar los campos de entrada
                $("#group-code").val("");
                $("#group-name").val("");
                
                // Mostrar notificación de éxito
                showNotification("Grupo creado correctamente", "success");
            }).catch(error => {
                showNotification(`Error al crear grupo: ${error.message}`, "error");
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
        showNotification("No hay usuario autenticado. Por favor, inicia sesión.", "error");
        return;
    }
    
    database.ref(`users/${user.uid}/groups/${groupKey}`).remove()
        .then(() => {
            showNotification("Grupo eliminado correctamente", "success");
            loadGroupsForEdit();
        })
        .catch((error) => {
            showNotification("Error al eliminar grupo: " + error.message, "error");
        });
}

// Función modificada para mostrar confirmación de eliminación de grupo
function showDeleteGroupConfirmation(groupKey, groupName) {
    showCustomConfirmation(
        `¿Estás seguro de que deseas eliminar el grupo "${groupName}"?`, 
        () => deleteGroup(groupKey, groupName), 
        null
    );
}
// Función para generar informe individual de estudiante

// Llamar a esta función después de cargar el overlay de historial

// Actualizar la barra lateral para incluir la gestión de grupos
function updateSidebar() {
    $(".sidebar").html(`
        <h2>Menu</h2>
        <button>Gestionar asistencia</button>
        <button>Grupos a cargo</button>
        <button>Gestionar estudiantes</button>
        <button>Gestionar grupos</button>
        <button id="searchStudentsBtn">Buscar estudiantes</button>
        <button>Informes</button>
        <button>Info de cuenta</button>
        <button id="logoutButton" class="botonLogout">Cerrar Sesión</button>
    `);
    
    // Original button functionality
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
        } else if (action === "Buscar estudiantes") {
            showSearchInterface();
        } else if (action === "Informes") {
            showReportsInterface() 
        } else if (action === "Info de cuenta") {
            showAccountInfo();
        } else if (action === "Cerrar Sesión") {
            auth.signOut()
                .then(() => {
                    showNotification('Sesión cerrada correctamente', 'success');
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    showNotification('Error al cerrar sesión: ' + error.message, 'error');
                });
        }
        
        // Add mobile menu closing functionality - this won't interfere with the original functionality
        if (window.innerWidth <= 768) {
            $('.mobile-nav-toggle').removeClass('active');
            $('.sidebar').removeClass('active');
            $('.mobile-backdrop').removeClass('active');
            $('body').removeClass('no-scroll');
        }
    });
    
    // Initialize mobile navigation after updating sidebar
    initMobileNavigation();
}
async function generateStudentReport(studentId, groupName, startDate = null, endDate = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification("No hay usuario autenticado", "error");
        return null;
    }

    // Get student info
    let studentInfo = { name: "", dni: "", group: groupName };
    try {
        // Find the student in the specified group
        const groupsRef = database.ref(`users/${user.uid}/groups`);
        const groupsSnapshot = await groupsRef.once('value');
        
        groupsSnapshot.forEach((groupSnapshot) => {
            const group = groupSnapshot.val();
            if (group.name === groupName && group.students) {
                Object.entries(group.students).forEach(([id, student]) => {
                    if (id === studentId) {
                        studentInfo.name = student.name || "Sin nombre";
                        studentInfo.dni = student.dni || "Sin DNI";
                    }
                });
            }
        });
        
        // Get attendance records
        const attendanceRef = database.ref(`users/${user.uid}/attendance/${studentId}`);
        const attendanceSnapshot = await attendanceRef.orderByChild('timestamp').once('value');
        
        const attendance = [];
        let present = 0;
        let absent = 0;
        
        // Process each attendance record
        attendanceSnapshot.forEach((record) => {
            const data = record.val();
            
            // Only include records for the specified group
            if (data.groupName === groupName) {
                // Convert date string to Date object for comparison
                const recordDate = new Date(data.date);
                
                // Fix: Ensure proper date comparison by setting time to midnight
                if (startDate) {
                    const startDateTime = new Date(startDate);
                    startDateTime.setHours(0, 0, 0, 0);
                    if (recordDate < startDateTime) return;
                }
                
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    if (recordDate > endDateTime) return;
                }
                
                // Count attendance status
                if (data.status === "Presente") present++;
                else if (data.status === "Ausente") absent++;
                
                // Add to attendance array
                attendance.push({
                    date: data.date,
                    status: data.status
                });
            }
        });
        
        // Sort attendance by date (newest first)
        attendance.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Calculate summary
        const totalDays = present + absent;
        const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
        
        // Format date range for report
        let period = "Todo el período";
        if (startDate && endDate) {
            period = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        } else if (startDate) {
            period = `Desde ${new Date(startDate).toLocaleDateString()}`;
        } else if (endDate) {
            period = `Hasta ${new Date(endDate).toLocaleDateString()}`;
        }
        
        return {
            studentInfo,
            attendance,
            summary: {
                totalDays,
                present,
                absent,
                percentage
            },
            generatedDate: new Date().toLocaleDateString(),
            period
        };
        
    } catch (error) {
        console.error("Error generating student report:", error);
        showNotification("Error al generar el informe: " + error.message, "error");
        return null;
    }
}
async function generateGroupReport(groupName, startDate = null, endDate = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification("No hay usuario autenticado", "error");
        return null;
    }

    const reportData = {
        groupInfo: {},
        students: [],
        dates: [],
        attendanceMatrix: {},
        summary: {},
        generatedDate: new Date().toLocaleDateString(),
        period: startDate && endDate ? `Del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}` : "Todo el historial"
    };

    try {
        // Get group info
        const groupSnapshot = await database.ref(`users/${user.uid}/groups`).orderByChild('name').equalTo(groupName).once('value');
        let groupData = null;
        let groupKey = null;
        groupSnapshot.forEach(group => {
            groupData = group.val();
            groupKey = group.key;
        });

        if (!groupData) throw new Error("Grupo no encontrado");

        reportData.groupInfo = {
            name: groupData.name,
            code: groupData.code,
            courseName: groupData.courseName
        };

        // Get students
        const studentsSnapshot = await database.ref(`users/${user.uid}/groups/${groupKey}/students`).once('value');
        const students = [];
        studentsSnapshot.forEach(student => {
            students.push({
                id: student.key,
                name: student.val().name,
                dni: student.val().dni
            });
        });

        // Get unique dates and attendance matrix
        const attendancePromises = students.map(student => 
            database.ref(`users/${user.uid}/attendance/${student.id}`).once('value')
        );
        const attendanceSnapshots = await Promise.all(attendancePromises);

        const dateSet = new Set();
        reportData.attendanceMatrix = {};
        students.forEach((student, index) => {
            reportData.attendanceMatrix[student.id] = {};
            attendanceSnapshots[index].forEach(record => {
                const attendance = record.val();
                if (attendance.groupName === groupName) {
                    const recordDate = new Date(attendance.timestamp);
                    if ((!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate)) {
                        const dateStr = attendance.date;
                        dateSet.add(dateStr);
                        reportData.attendanceMatrix[student.id][dateStr] = attendance.status === 'Presente' ? 'P' : 'A';
                    }
                }
            });
        });

        reportData.dates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
        reportData.students = students;

        // Calculate summary per student and group
        reportData.students.forEach(student => {
            const studentAttendance = reportData.attendanceMatrix[student.id];
            const total = reportData.dates.length;
            const present = reportData.dates.reduce((sum, date) => 
                sum + (studentAttendance[date] === 'P' ? 1 : 0), 0);
            student.summary = {
                totalDays: total,
                present: present,
                absent: total - present,
                percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0
            };
        });

        const totalStudents = students.length;
        const totalPresent = reportData.students.reduce((sum, s) => sum + s.summary.present, 0);
        const totalDays = reportData.dates.length * totalStudents;
        reportData.summary = {
            totalStudents: totalStudents,
            averageAttendance: totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(2) : 0
        };

        return reportData;
    } catch (error) {
        showNotification("Error al generar reporte de grupo: " + error.message, "error");
        return null;
    }
}
async function generateGroupReport(groupName, startDate = null, endDate = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification("No hay usuario autenticado", "error");
        return null;
    }

    const reportData = {
        groupInfo: {},
        students: [],
        dates: [],
        attendanceMatrix: {},
        summary: {},
        generatedDate: new Date().toLocaleDateString(),
        period: startDate && endDate ? `Del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}` : "Todo el historial"
    };

    try {
        // Get group info
        const groupSnapshot = await database.ref(`users/${user.uid}/groups`).orderByChild('name').equalTo(groupName).once('value');
        let groupData = null;
        let groupKey = null;
        groupSnapshot.forEach(group => {
            groupData = group.val();
            groupKey = group.key;
        });

        if (!groupData) throw new Error("Grupo no encontrado");

        reportData.groupInfo = {
            name: groupData.name,
            code: groupData.code,
            courseName: groupData.courseName
        };

        // Get students
        const studentsSnapshot = await database.ref(`users/${user.uid}/groups/${groupKey}/students`).once('value');
        const students = [];
        studentsSnapshot.forEach(student => {
            students.push({
                id: student.key,
                name: student.val().name,
                dni: student.val().dni
            });
        });

        // Get unique dates and attendance matrix
        const attendancePromises = students.map(student => 
            database.ref(`users/${user.uid}/attendance/${student.id}`).once('value')
        );
        const attendanceSnapshots = await Promise.all(attendancePromises);

        const dateSet = new Set();
        reportData.attendanceMatrix = {};
        students.forEach((student, index) => {
            reportData.attendanceMatrix[student.id] = {};
            attendanceSnapshots[index].forEach(record => {
                const attendance = record.val();
                if (attendance.groupName === groupName) {
                    const recordDate = new Date(attendance.timestamp);
                    if ((!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate)) {
                        const dateStr = attendance.date;
                        dateSet.add(dateStr);
                        reportData.attendanceMatrix[student.id][dateStr] = attendance.status === 'Presente' ? 'P' : 'A';
                    }
                }
            });
        });

        reportData.dates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
        reportData.students = students;

        // Calculate summary per student and group
        reportData.students.forEach(student => {
            const studentAttendance = reportData.attendanceMatrix[student.id];
            const total = reportData.dates.length;
            const present = reportData.dates.reduce((sum, date) => 
                sum + (studentAttendance[date] === 'P' ? 1 : 0), 0);
            student.summary = {
                totalDays: total,
                present: present,
                absent: total - present,
                percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0
            };
        });

        const totalStudents = students.length;
        const totalPresent = reportData.students.reduce((sum, s) => sum + s.summary.present, 0);
        const totalDays = reportData.dates.length * totalStudents;
        reportData.summary = {
            totalStudents: totalStudents,
            averageAttendance: totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(2) : 0
        };

        return reportData;
    } catch (error) {
        showNotification("Error al generar reporte de grupo: " + error.message, "error");
        return null;
    }
}
function exportToXLSX(data) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Determine if this is a student report or a group report
    const isStudentReport = data.studentInfo !== undefined;
    const isGroupReport = data.groupInfo !== undefined;
    
    // Set document properties
    wb.Props = {
        Title: isStudentReport 
            ? `Reporte de Asistencia - ${data.studentInfo.name}` 
            : (isGroupReport ? `Reporte de Grupo - ${data.groupInfo.name}` : "Reporte de Asistencia"),
        Subject: "Reporte de Asistencia",
        Author: "Sistema de Asistencia",
        CreatedDate: new Date()
    };
    
    // === STUDENT REPORT ===
    if (isStudentReport) {
        // --- STUDENT INFO SHEET ---
        const studentInfoData = [
            ["INFORMACIÓN DEL ESTUDIANTE", ""],
            ["Nombre:", data.studentInfo.name],
            ["DNI:", data.studentInfo.dni],
            ["Grupo:", data.studentInfo.group],
            ["Periodo:", data.period],
            ["Reporte generado:", data.generatedDate]
        ];
        
        const wsInfo = XLSX.utils.aoa_to_sheet(studentInfoData);
        
        // Apply styles to student info sheet
        wsInfo['!cols'] = [{ wch: 25 }, { wch: 35 }];
        applyHeaderStyle(wsInfo, "A1:B1");
        
        XLSX.utils.book_append_sheet(wb, wsInfo, "Información");
        
        // --- ATTENDANCE SHEET ---
        const attendanceData = [
            ["REGISTRO DE ASISTENCIA", "", ""],
            ["Fecha", "Estado", "Observaciones"],
            ...data.attendance.map(a => [a.date, a.status, ""])
        ];
        
        const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
        
        // Apply styles to attendance sheet
        wsAttendance['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }];
        applyHeaderStyle(wsAttendance, "A1:C1");
        applyTableHeaderStyle(wsAttendance, "A2:C2");
        
        // Apply conditional formatting for attendance status
        for (let i = 0; i < data.attendance.length; i++) {
            const rowIndex = i + 3; // Starting from row 3 (after headers)
            const cellRef = `B${rowIndex}`;
            
            if (data.attendance[i].status === 'Presente') {
                applyCellStyle(wsAttendance, cellRef, { fill: { fgColor: { rgb: "C6EFCE" }, patternType: "solid" } });
            } else {
                applyCellStyle(wsAttendance, cellRef, { fill: { fgColor: { rgb: "FFCCCC" }, patternType: "solid" } });
            }
        }
        
        XLSX.utils.book_append_sheet(wb, wsAttendance, "Asistencia");
        
        // --- SUMMARY SHEET ---
        const summaryData = [
            ["RESUMEN DE ASISTENCIA", "", ""],
            ["Métrica", "Valor", "Porcentaje"],
            ["Total días registrados", data.summary.totalDays, "100%"],
            ["Días presentes", data.summary.present, `${data.summary.percentage}%`],
            ["Días ausentes", data.summary.absent, `${(100 - parseFloat(data.summary.percentage || 0)).toFixed(2)}%`]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Apply styles to summary sheet
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
        applyHeaderStyle(wsSummary, "A1:C1");
        applyTableHeaderStyle(wsSummary, "A2:C2");
        
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        
        // --- CHART DATA SHEET WITH CHART ---
        const chartData = [
            ["DATOS PARA GRÁFICO", ""],
            ["Estado", "Cantidad"],
            ["Presente", data.summary.present],
            ["Ausente", data.summary.absent]
        ];
        
        const wsChart = XLSX.utils.aoa_to_sheet(chartData);
        
        // Apply styles to chart data sheet
        wsChart['!cols'] = [{ wch: 15 }, { wch: 15 }];
        applyHeaderStyle(wsChart, "A1:B1");
        applyTableHeaderStyle(wsChart, "A2:B2");
        
        // Add chart drawing XML to the sheet
        if (!wsChart.drawings) wsChart.drawings = [];
        
        // Add a chart using the drawing API
        const chartDrawing = createPieChart({
            name: "Asistencia del Estudiante",
            labels: ["Presente", "Ausente"],
            values: [data.summary.present, data.summary.absent],
            position: "E2",
            width: 480,
            height: 288
        });
        
        wsChart.drawings.push(chartDrawing);
        
        XLSX.utils.book_append_sheet(wb, wsChart, "Gráfico");
        
        // Download the file
        const fileName = `reporte-asistencia-${data.studentInfo.name.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        return fileName;
    }
    
    // === GROUP REPORT ===
    else if (isGroupReport) {
        // --- GROUP INFO SHEET ---
        const groupInfoData = [
            ["INFORMACIÓN DEL GRUPO", ""],
            ["Nombre:", data.groupInfo.name],
            ["Código:", data.groupInfo.code || ""],
            ["Curso:", data.groupInfo.courseName || ""],
            ["Periodo:", data.period],
            ["Reporte generado:", data.generatedDate],
            ["Total estudiantes:", data.summary.totalStudents],
            ["Promedio asistencia:", `${data.summary.averageAttendance}%`]
        ];
        
        const wsInfo = XLSX.utils.aoa_to_sheet(groupInfoData);
        
        // Apply styles to group info sheet
        wsInfo['!cols'] = [{ wch: 25 }, { wch: 35 }];
        applyHeaderStyle(wsInfo, "A1:B1");
        
        XLSX.utils.book_append_sheet(wb, wsInfo, "Información");
        
        // --- ATTENDANCE MATRIX SHEET ---
        // Create header row with dates
        const matrixHeader = ["Estudiante", "DNI", ...data.dates, "% Asistencia"];
        
        // Create data rows for each student
        const matrixRows = data.students.map(student => {
            const attendanceRow = [
                student.name,
                student.dni || "",
                ...data.dates.map(date => data.attendanceMatrix[student.id][date] || '-'),
                `${student.summary.percentage}%`
            ];
            return attendanceRow;
        });
        
        const matrixData = [matrixHeader, ...matrixRows];
        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
        
        // Apply styles to matrix sheet
        const lastCol = String.fromCharCode(65 + matrixHeader.length - 1); // Calculate last column letter
        wsMatrix['!cols'] = [
            { wch: 30 }, // Estudiante
            { wch: 15 }, // DNI
            ...Array(data.dates.length).fill({ wch: 12 }), // Dates
            { wch: 15 } // % Asistencia
        ];
        
        applyHeaderStyle(wsMatrix, `A1:${lastCol}1`);
        
        // Apply conditional formatting for attendance cells
        for (let r = 0; r < matrixRows.length; r++) {
            const rowIndex = r + 2; // Starting from row 2 (after header)
            const student = data.students[r];
            
            // Apply color to attendance cells (P/A)
            for (let c = 0; c < data.dates.length; c++) {
                const colIndex = c + 2; // Starting from column C (after name and DNI)
                const colLetter = String.fromCharCode(65 + colIndex);
                const cellRef = `${colLetter}${rowIndex}`;
                
                if (matrixRows[r][colIndex] === 'P') {
                    applyCellStyle(wsMatrix, cellRef, { fill: { fgColor: { rgb: "C6EFCE" }, patternType: "solid" } });
                } else if (matrixRows[r][colIndex] === 'A') {
                    applyCellStyle(wsMatrix, cellRef, { fill: { fgColor: { rgb: "FFCCCC" }, patternType: "solid" } });
                }
            }
            
            // Highlight percentage cell based on attendance rate
            const percentCol = String.fromCharCode(65 + matrixHeader.length - 1);
            const percentCellRef = `${percentCol}${rowIndex}`;
            const percentage = parseFloat(student.summary.percentage || 0);
            
            if (percentage >= 90) {
                applyCellStyle(wsMatrix, percentCellRef, { fill: { fgColor: { rgb: "C6EFCE" }, patternType: "solid" } });
            } else if (percentage < 75) {
                applyCellStyle(wsMatrix, percentCellRef, { fill: { fgColor: { rgb: "FFCCCC" }, patternType: "solid" } });
            } else {
                applyCellStyle(wsMatrix, percentCellRef, { fill: { fgColor: { rgb: "FFEB9C" }, patternType: "solid" } });
            }
        }
        
        XLSX.utils.book_append_sheet(wb, wsMatrix, "Matriz de Asistencia");
        
        // --- STUDENT SUMMARY SHEET ---
        const studentSummaryHeader = ["Nombre", "DNI", "Días Registrados", "Presente", "Ausente", "% Asistencia"];
        const studentSummaryRows = data.students.map(student => [
            student.name,
            student.dni || "",
            student.summary.totalDays,
            student.summary.present,
            student.summary.absent,
            `${student.summary.percentage}%`
        ]);
        
        const summaryData = [studentSummaryHeader, ...studentSummaryRows];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Apply styles to summary sheet
        wsSummary['!cols'] = [
            { wch: 30 }, // Nombre
            { wch: 15 }, // DNI
            { wch: 15 }, // Días Registrados
            { wch: 15 }, // Presente
            { wch: 15 }, // Ausente
            { wch: 15 }  // % Asistencia
        ];
        
        applyHeaderStyle(wsSummary, "A1:F1");
        
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen por Estudiante");
        
        // --- CHART SHEET 1: OVERALL ATTENDANCE ---
        // Calculate average attendance for the group
        const presentAvg = parseFloat(data.summary.averageAttendance || 0);
        const absentAvg = 100 - presentAvg;
        
        const overallChartData = [
            ["ASISTENCIA PROMEDIO DEL GRUPO", ""],
            ["Estado", "Porcentaje"],
            ["Presente", presentAvg.toFixed(2)],
            ["Ausente", absentAvg.toFixed(2)]
        ];
        
        const wsChartOverall = XLSX.utils.aoa_to_sheet(overallChartData);
        
        // Apply styles to chart data sheet
        wsChartOverall['!cols'] = [{ wch: 25 }, { wch: 15 }];
        applyHeaderStyle(wsChartOverall, "A1:B1");
        applyTableHeaderStyle(wsChartOverall, "A2:B2");
        
        // Add chart drawing
        if (!wsChartOverall.drawings) wsChartOverall.drawings = [];
        
        const pieChartDrawing = createPieChart({
            name: "Asistencia Promedio del Grupo",
            labels: ["Presente", "Ausente"],
            values: [presentAvg, absentAvg],
            position: "D2",
            width: 480,
            height: 288
        });
        
        wsChartOverall.drawings.push(pieChartDrawing);
        
        XLSX.utils.book_append_sheet(wb, wsChartOverall, "Gráfico - General");
        
        // --- CHART SHEET 2: STUDENT COMPARISON ---
        // Create data for student attendance chart
        const chartHeader = ["Estudiante", "% Asistencia"];
        const chartRows = data.students.map(student => [
            student.name.substring(0, 20) + (student.name.length > 20 ? "..." : ""), // Truncate long names
            parseFloat(student.summary.percentage || 0)
        ]);
        
        const chartData = [chartHeader, ...chartRows];
        const wsChart = XLSX.utils.aoa_to_sheet(chartData);
        
        // Apply styles to chart data sheet
        wsChart['!cols'] = [{ wch: 25 }, { wch: 15 }];
        applyHeaderStyle(wsChart, "A1:B1");
        applyTableHeaderStyle(wsChart, "A2:B2");
        
        // Add chart drawing
        if (!wsChart.drawings) wsChart.drawings = [];
        
        const barChartDrawing = createBarChart({
            name: "Comparativa de Asistencia por Estudiante",
            range: `A2:B${chartRows.length + 2}`, // Include header row
            position: "D2",
            width: 720,
            height: Math.max(300, chartRows.length * 20) // Adjust height based on number of students
        });
        
        wsChart.drawings.push(barChartDrawing);
        
        XLSX.utils.book_append_sheet(wb, wsChart, "Gráfico - Estudiantes");
        
        // Download the file
        const fileName = `reporte-grupo-${data.groupInfo.name.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        return fileName;
    }
    
    // === FALLBACK - GENERIC REPORT ===
    else {
        // Handle the case where neither student nor group info is available
        showNotification("No se pudo determinar el tipo de reporte. Compruebe los datos.", "error");
        return null;
    }
}

// Helper Functions for Cell Styling
function applyHeaderStyle(worksheet, range) {
    const [startCell, endCell] = range.split(':');
    const startCol = startCell.charAt(0);
    const startRow = parseInt(startCell.substring(1));
    const endCol = endCell.charAt(0);
    const endRow = parseInt(endCell.substring(1));
    
    for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
        for (let row = startRow; row <= endRow; row++) {
            const cellRef = `${String.fromCharCode(col)}${row}`;
            applyCellStyle(worksheet, cellRef, {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4472C4" }, patternType: "solid" },
                alignment: { horizontal: "center", vertical: "center" }
            });
        }
    }
}

function applyTableHeaderStyle(worksheet, range) {
    const [startCell, endCell] = range.split(':');
    const startCol = startCell.charAt(0);
    const startRow = parseInt(startCell.substring(1));
    const endCol = endCell.charAt(0);
    const endRow = parseInt(endCell.substring(1));
    
    for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
        for (let row = startRow; row <= endRow; row++) {
            const cellRef = `${String.fromCharCode(col)}${row}`;
            applyCellStyle(worksheet, cellRef, {
                font: { bold: true },
                fill: { fgColor: { rgb: "E0E0E0" }, patternType: "solid" },
                alignment: { horizontal: "center" }
            });
        }
    }
}

function applyCellStyle(worksheet, cellRef, style) {
    if (!worksheet['!cells']) worksheet['!cells'] = {};
    worksheet['!cells'][cellRef] = style;
}

// Chart generation functions
function createPieChart(options) {
    const { name, labels, values, position, width, height } = options;
    
    // This is a simplified approach, in reality you would need to use the 
    // Office Open XML format to define the chart
    
    // Create a drawing object that Excel will recognize
    const drawing = {
        type: "pieChart",
        name: name,
        title: name,
        position: position, // Cell reference for the top-left corner
        width: width || 480,
        height: height || 288,
        data: {
            labels: labels,
            values: values
        },
        // Add necessary XML for Office Open XML chart
        xml: `
            <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
                <c:chart>
                    <c:title>
                        <c:tx>
                            <c:strRef>
                                <c:f>${name}</c:f>
                            </c:strRef>
                        </c:tx>
                    </c:title>
                    <c:plotArea>
                        <c:pieChart>
                            <c:ser>
                                <c:idx val="0"/>
                                <c:cat>
                                    <c:strLit>
                                        ${labels.map((label, i) => `<c:pt idx="${i}"><c:v>${label}</c:v></c:pt>`).join('')}
                                    </c:strLit>
                                </c:cat>
                                <c:val>
                                    <c:numLit>
                                        ${values.map((value, i) => `<c:pt idx="${i}"><c:v>${value}</c:v></c:pt>`).join('')}
                                    </c:numLit>
                                </c:val>
                            </c:ser>
                        </c:pieChart>
                    </c:plotArea>
                    <c:legend>
                        <c:legendPos val="r"/>
                    </c:legend>
                </c:chart>
            </c:chartSpace>
        `
    };
    
    return drawing;
}

function createBarChart(options) {
    const { name, range, position, width, height } = options;
    
    // This is a simplified approach, in reality you would need to use the 
    // Office Open XML format to define the chart
    
    // Create a drawing object that Excel will recognize
    const drawing = {
        type: "barChart",
        name: name,
        title: name,
        position: position, // Cell reference for the top-left corner
        width: width || 480,
        height: height || 288,
        data: {
            range: range
        },
        // Add necessary XML for Office Open XML chart
        xml: `
            <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
                <c:chart>
                    <c:title>
                        <c:tx>
                            <c:strRef>
                                <c:f>${name}</c:f>
                            </c:strRef>
                        </c:tx>
                    </c:title>
                    <c:plotArea>
                        <c:barChart>
                            <c:barDir val="bar"/>
                            <c:ser>
                                <c:idx val="0"/>
                                <c:order val="0"/>
                                <c:cat>
                                    <c:strRef>
                                        <c:f>${range.split(':')[0].replace(/[0-9]/g, '')}${range.split(':')[0].replace(/[A-Z]/g, '')}:${range.split(':')[0].replace(/[0-9]/g, '')}${range.split(':')[1].replace(/[A-Z]/g, '')}</c:f>
                                    </c:strRef>
                                </c:cat>
                                <c:val>
                                    <c:numRef>
                                        <c:f>${range.split(':')[1].replace(/[0-9]/g, '')}${range.split(':')[0].replace(/[A-Z]/g, '')}:${range.split(':')[1].replace(/[0-9]/g, '')}${range.split(':')[1].replace(/[A-Z]/g, '')}</c:f>
                                    </c:numRef>
                                </c:val>
                            </c:ser>
                            <c:axId val="0"/>
                            <c:axId val="1"/>
                        </c:barChart>
                    </c:plotArea>
                    <c:legend>
                        <c:legendPos val="r"/>
                    </c:legend>
                </c:chart>
            </c:chartSpace>
        `
    };
    
    return drawing;
}
function exportToPDF(data, type = 'student') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Informe de Asistencia - ${type === 'student' ? data.studentInfo.name : data.groupInfo.name}`, 15, 15);
    doc.setFontSize(12);
    
    if (type === 'student') {
        doc.text(`DNI: ${data.studentInfo.dni}`, 15, 25);
        doc.text(`Grupo: ${data.studentInfo.group}`, 15, 30);
        doc.text(`Generado el: ${data.generatedDate}`, 15, 35);
        doc.text(`Período: ${data.period}`, 15, 40);
        
        const tableData = data.attendance.map(a => [a.date, a.status]);
        doc.autoTable({
            startY: 45,
            head: [['Fecha', 'Estado']],
            body: tableData
        });
        
        doc.text(`Resumen:`, 15, doc.lastAutoTable.finalY + 10);
        doc.text(`- Total días registrados: ${data.summary.totalDays}`, 15, doc.lastAutoTable.finalY + 15);
        doc.text(`- Días presentes: ${data.summary.present} (${data.summary.percentage}%)`, 15, doc.lastAutoTable.finalY + 20);
        doc.text(`- Días ausentes: ${data.summary.absent}`, 15, doc.lastAutoTable.finalY + 25);
    } else if (type === 'group') {
        doc.text(`Código: ${data.groupInfo.code}`, 15, 25);
        doc.text(`Curso: ${data.groupInfo.courseName}`, 15, 30);
        doc.text(`Generado el: ${data.generatedDate}`, 15, 35);
        doc.text(`Período: ${data.period}`, 15, 40);
        
        const tableData = data.students.map(student => {
            const attendanceRow = data.dates.map(date => data.attendanceMatrix[student.id][date] || '-');
            return [student.name, student.dni, ...attendanceRow, student.summary.present, `${student.summary.percentage}%`];
        });
        
        doc.autoTable({
            startY: 45,
            head: [['Estudiante', 'DNI', ...data.dates, 'Presentes', '% Asistencia']],
            body: tableData,
            styles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 } }
        });
        
        doc.text(`Resumen del grupo:`, 15, doc.lastAutoTable.finalY + 10);
        doc.text(`- Total estudiantes: ${data.summary.totalStudents}`, 15, doc.lastAutoTable.finalY + 15);
        doc.text(`- Promedio de asistencia: ${data.summary.averageAttendance}%`, 15, doc.lastAutoTable.finalY + 20);
    }

    doc.save(`reporte-${type}-${new Date().toISOString().slice(0,10)}.pdf`);
}
function showReportsInterface() {
    $(".main-content").html(`
        <div class="reports-interface-container glass-effect">
            <h3 style="text-align: center;">Generar Informes</h3>
            <div class="report-tabs">
                <button class="tab-btn active" data-type="student">Informe Individual</button>
                <button class="tab-btn" data-type="group">Informe Grupal</button>
            </div>
            <div class="report-config">
                <div class="report-filters">
                    <label>Grupo:</label>
                    <select id="groupSelect" class="report-select"></select>
                    <div id="studentFilter" style="display: none;">
                        <label>Estudiante:</label>
                        <select id="studentSelect" class="report-select"></select>
                    </div>
                    <label>Desde:</label>
                    <input type="date" id="startDate" class="date-picker">
                    <label>Hasta:</label>
                    <input type="date" id="endDate" class="date-picker">
                </div>
                <div class="report-actions">
                    <button id="generateReportBtn">Generar Reporte</button>
                    <button id="exportCSVBtn" disabled>Exportar a XLSX</button>
                    <button id="exportPDFBtn" disabled>Exportar a PDF</button>
                </div>
            </div>
            <div id="reportPreview" class="report-preview"></div>
        </div>
    `);

    let currentReport = null;

    // Load groups
    const user = firebase.auth().currentUser;
    if (user) {
        database.ref(`users/${user.uid}/groups`).once('value', snapshot => {
            $("#groupSelect").append('<option value="">Seleccionar Grupo</option>');
            snapshot.forEach(group => {
                $("#groupSelect").append(`<option value="${group.val().name}">${group.val().name}</option>`);
            });
        });
    }

    // Tab switching
    $(".tab-btn").click(function() {
        $(".tab-btn").removeClass('active');
        $(this).addClass('active');
        const type = $(this).data('type');
        $("#studentFilter").toggle(type === 'student');
        $("#studentSelect").val('');
        $("#reportPreview").empty();
        $("#exportCSVBtn, #exportPDFBtn").prop('disabled', true);
        currentReport = null;
    });

    // Load students when group is selected
    $("#groupSelect").change(function() {
        const groupName = $(this).val();
        $("#studentSelect").empty().append('<option value="">Seleccionar Estudiante</option>');
        $("#reportPreview").empty();
        $("#exportCSVBtn, #exportPDFBtn").prop('disabled', true);
        currentReport = null;

        if (groupName && $(".tab-btn.active").data('type') === 'student') {
            database.ref(`users/${user.uid}/groups`).orderByChild('name').equalTo(groupName).once('value', snapshot => {
                snapshot.forEach(group => {
                    const students = group.val().students || {};
                    Object.entries(students).forEach(([id, student]) => {
                        $("#studentSelect").append(`<option value="${id}" data-group="${groupName}">${student.name}</option>`);
                    });
                });
            });
        }
    });

    // Generate report
    $("#generateReportBtn").click(async () => {
        const reportType = $(".tab-btn.active").data('type');
        const groupName = $("#groupSelect").val();
        const studentId = $("#studentSelect").val();
        const startDate = $("#startDate").val() ? new Date($("#startDate").val()) : null;
        const endDate = $("#endDate").val() ? new Date($("#endDate").val()) : null;

        if (!groupName) {
            showNotification("Por favor seleccione un grupo", "warning");
            return;
        }

        try {
            if (reportType === 'student') {
                if (!studentId) {
                    showNotification("Por favor seleccione un estudiante", "warning");
                    return;
                }
                currentReport = await generateStudentReport(studentId, groupName, startDate, endDate);
            } else {
                currentReport = await generateGroupReport(groupName, startDate, endDate);
            }

            if (currentReport) {
                displayReportPreview(currentReport, reportType);
                $("#exportCSVBtn, #exportPDFBtn").prop('disabled', false);
            }
        } catch (error) {
            showNotification("Error al generar el reporte: " + error.message, "error");
        }
    });

    // Export actions
    $("#exportCSVBtn").click(() => {
        if (currentReport) exportToXLSX(currentReport, $(".tab-btn.active").data('type'));
    });

    $("#exportPDFBtn").click(() => {
        if (currentReport) exportToPDF(currentReport, $(".tab-btn.active").data('type'));
    });
}

// Display report preview with chart
function displayReportPreview(report, type) {
    const preview = $("#reportPreview");
    preview.empty();

    if (type === 'student') {
        preview.html(`
            <h4>Informe de Asistencia - ${report.studentInfo.name}</h4>
            <p><strong>DNI:</strong> ${report.studentInfo.dni}</p>
            <p><strong>Grupo:</strong> ${report.studentInfo.group}</p>
            <p><strong>Generado el:</strong> ${report.generatedDate}</p>
            <p><strong>Período:</strong> ${report.period}</p>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.attendance.map(a => `
                        <tr>
                            <td>${a.date}</td>
                            <td>${a.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="report-summary">
                <h5>Resumen</h5>
                <p>Total días registrados: ${report.summary.totalDays}</p>
                <p>Días presentes: ${report.summary.present} (${report.summary.percentage}%)</p>
                <p>Días ausentes: ${report.summary.absent}</p>
                <canvas id="studentChart" width="400" height="200"></canvas>
            </div>
        `);

        // Pie chart
        const ctx = document.getElementById('studentChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Presente', 'Ausente'],
                datasets: [{
                    data: [report.summary.present, report.summary.absent],
                    backgroundColor: ['#36A2EB', '#FF6384']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Distribución de Asistencia' }
                }
            }
        });
    } else if (type === 'group') {
        preview.html(`
            <h4>Informe de Asistencia - ${report.groupInfo.name}</h4>
            <p><strong>Código:</strong> ${report.groupInfo.code}</p>
            <p><strong>Curso:</strong> ${report.groupInfo.courseName}</p>
            <p><strong>Generado el:</strong> ${report.generatedDate}</p>
            <p><strong>Período:</strong> ${report.period}</p>
            <div style="overflow-x: auto;">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>DNI</th>
                            ${report.dates.map(date => `<th>${date}</th>`).join('')}
                            <th>Presentes</th>
                            <th>% Asistencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.students.map(student => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.dni}</td>
                                ${report.dates.map(date => `
                                    <td>${report.attendanceMatrix[student.id][date] || '-'}</td>
                                `).join('')}
                                <td>${student.summary.present}</td>
                                <td>${student.summary.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="report-summary">
                <h5>Resumen del grupo</h5>
                <p>Total estudiantes: ${report.summary.totalStudents}</p>
                <p>Promedio de asistencia: ${report.summary.averageAttendance}%</p>
                <canvas id="groupChart" width="400" height="200"></canvas>
            </div>
        `);

        // Bar chart for group average
        const ctx = document.getElementById('groupChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: report.students.map(s => s.name),
                datasets: [{
                    label: '% Asistencia',
                    data: report.students.map(s => s.summary.percentage),
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Asistencia por Estudiante' }
                }
            }
        });
    }
}
function showSearchInterface() {
    $(".main-content").html(`
        <div class="search-interface-container glass-effect">
            <h3 style="text-align: center;">Buscar Estudiantes</h3>
            <div class="search-box">
                <div style="text-align: center;">
                <input type="text" id="searchInput" placeholder="Buscar por nombre o DNI..." style="display: inline-block; margin-bottom: 10px;">
                <button id="searchButton" style="display: inline-block;">
                    <i class="fas fa-search"></i>
                </button>
                </div>
            </div>
            <div id="search-results" class="search-results-container" style="display: none;">
                <h4>Resultados de búsqueda</h4>
                <div id="search-results-list"></div>
                <button id="closeSearchResults" class="btn">Cerrar resultados</button>
            </div>
        </div>
        
        <div class="attendance-menu-overlay glass-effect" id="attendanceMenuOverlay" style="display:none;">
            <button class="close-btn"><i class="fas fa-times"></i></button>
            <h3 id="studentName"></h3>
            <div class="attendance-menu-buttons">
                <button id="markPresentBtn"><i class="fas fa-check"></i> Marcar Presente</button>
                <button id="markAbsentBtn"><i class="fas fa-times"></i> Marcar Ausente</button>
                <button id="deleteAttendanceBtn"><i class="fas fa-trash"></i> Eliminar asistencia</button>
                <button id="viewHistoryBtn"><i class="fas fa-history"></i> Ver historial</button>
            </div>
        </div>
        
        <div class="attendance-history-overlay glass-effect" id="attendanceHistoryOverlay" style="display:none;">
            <button class="close-btn"><i class="fas fa-times"></i></button>
            <h3 class="student-history-title">Historial de Asistencias</h3>
            <h4 id="historyStudentName"></h4>
            <div id="attendanceHistory">
                <table class="student-history-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceHistoryBody">
                        <!-- History will load dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `);
    
    // Configurar eventos para la búsqueda
    $("#searchButton").click(function() {
        const query = $("#searchInput").val();
        searchStudents(query);
    });
    
    $("#searchInput").keypress(function(e) {
        if (e.which === 13) { // Código de tecla Enter
            const query = $(this).val();
            searchStudents(query);
        }
    });
    
    $("#closeSearchResults").click(function() {
        $("#search-results").hide();
        $("#searchInput").val('');
    });
    
    // Evento delegado para manejar clics en los resultados de estudiantes
    $("#search-results-list").on("click", ".student-result", function() {
        let studentName = $(this).data("student-name");
        let studentId = $(this).data("student-id");
        let groupName = $(this).data("group-name");
        
        // Guardar los datos del estudiante y grupo actual
        currentStudent = {
            id: studentId,
            name: studentName
        };
        
        currentGroup = groupName;
        
        // Actualizar los elementos de la interfaz
        $("#studentName").text(studentName);
        $("#historyStudentName").text(studentName);
        
        // Mostrar el menú de asistencia
        $("#search-results").hide();
        $("#attendanceMenuOverlay").fadeIn(300);
    });
    
    // Configurar eventos para los overlays de asistencia
    $("#attendanceMenuOverlay .close-btn").click(function() {
        $("#attendanceMenuOverlay").hide();
        $("#search-results").fadeIn(300);
    });
    
    $("#attendanceHistoryOverlay .close-btn").click(function() {
        $("#attendanceHistoryOverlay").hide();
        $("#attendanceMenuOverlay").fadeIn(300);
    });
    
    // Configurar eventos para los botones de asistencia
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
        $("#attendanceHistoryOverlay").fadeIn(300);
    });
}
    // Asegúrese de que la función showNotification esté disponible
    // Si no la tiene definida en otro archivo, añádala aquí:
    function showNotification(message, type = 'info') {
        // Crear el elemento de notificación
        const notification = $(`<div class="notification ${type}">
            <span class="message">${message}</span>
        </div>`);
        
        // Añadir al DOM
        $("body").append(notification);
        
        // Mostrar con animación
        notification.addClass('show');
        
        // Auto-ocultar después de 3 segundos
        setTimeout(() => {
            notification.removeClass('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Permitir cerrar manualmente
        notification.find('.close-btn').click(function() {
            notification.removeClass('show');
            setTimeout(() => notification.remove(), 300);
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
                    <h3 style="text-align: center;">Información de la cuenta:</h3>
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
        <div class="groups-management-box glass-effect">
            <h3>Mis Grupos</h3>
            <div class="groups-container" id="dynamic-group-box">
                <!-- Groups will load dynamically here -->
                <p class="loading-message">Cargando grupos...</p>
            </div>
        </div>
        
        <div class="group-overlay glass-effect" id="groupOverlay">
            <button class="close-btn"><i class="fas fa-times"></i></button>
            <h3 id="groupTitle"></h3>
            <div class="name-list" id="studentsList">
                <!-- Students will load dynamically -->
            </div>
        </div>
        
        <div class="attendance-menu-overlay glass-effect" id="attendanceMenuOverlay">
            <button class="close-btn"><i class="fas fa-times"></i></button>
            <h3 id="studentName"></h3>
            <div class="attendance-menu-buttons">
                <button id="markPresentBtn"><i class="fas fa-check"></i> Marcar Presente</button>
                <button id="markAbsentBtn"><i class="fas fa-times"></i> Marcar Ausente</button>
                <button id="deleteAttendanceBtn"><i class="fas fa-trash"></i> Eliminar asistencia</button>
                <button id="viewHistoryBtn"><i class="fas fa-history"></i> Ver historial</button>
            </div>
        </div>
        
        <div class="attendance-history-overlay glass-effect" id="attendanceHistoryOverlay" style="display:none;">
            <button class="close-btn"><i class="fas fa-times"></i></button>
            <h3 class="student-history-title">Historial de Asistencias</h3>
            <h4 id="historyStudentName"></h4>
            <div id="attendanceHistory">
                <table class="student-history-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceHistoryBody">
                        <!-- History will load dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `);
    
    // Ocultar los overlays inicialmente
    // Cargar los estudiantes cuando se seleccione un grupo
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


    
    // Modificar la función loadGroups para mostrar los grupos en cards animadas
    // Esta es una función mock, debes adaptarla a tu implementación real
    function loadGroups() {
        // Limpiar el contenedor
        $("#dynamic-group-box").empty();
        
        // Obtener referencia a la base de datos
        const userId = firebase.auth().currentUser.uid;
        const groupsRef = firebase.database().ref('users/' + userId + '/groups');
        
        groupsRef.once('value').then((snapshot) => {
            if (snapshot.exists()) {
                let index = 0;
                snapshot.forEach((childSnapshot) => {
                    const groupData = childSnapshot.val();
                    const groupName = groupData.name || childSnapshot.key;
                    // Calcular número de estudiantes
                    let studentCount = 0;
                    if (groupData.students) {
                        studentCount = Object.keys(groupData.students).length;
                    }
                    
                    // Crear la tarjeta de grupo con animación retrasada
                    const groupCard = `
                        <div class="group-card" style="--order: ${index}" data-group-name="${groupName}">
                            <div class="group-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <h4 class="group-name">${groupName}</h4>
                            <p class="group-detail">${studentCount} estudiantes</p>
                        </div>
                    `;
                    
                    $("#dynamic-group-box").append(groupCard);
                    index++;
                });
                
                if (index === 0) {
                    $("#dynamic-group-box").html('<p class="loading-message">No hay grupos disponibles</p>');
                }
            } else {
                $("#dynamic-group-box").html('<p class="loading-message">No hay grupos disponibles</p>');
            }
        }).catch((error) => {
            console.error("Error loading groups:", error);
            $("#dynamic-group-box").html('<p class="loading-message">Error al cargar grupos</p>');
        });
    }
    
    // Cargar grupos dinámicamente
    loadGroups();
    
    // Evento delegado para las tarjetas de grupo
    $("#dynamic-group-box").on("click", ".group-card", function() {
        let groupName = $(this).data("group-name");
        $("#groupTitle").text(groupName);
        
        // Guardamos el nombre del grupo seleccionado
        currentGroup = groupName;
        
        // Cargar los estudiantes del grupo
        loadStudentsFromGroup(groupName);
        
        // Animación para mostrar overlay
        $(".groups-management-box").fadeOut(300, function() {
            $("#groupOverlay").fadeIn(300);
        });
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
                    
                    // Reemplazar confirm() con nuestro diálogo personalizado
                    showCustomConfirmation(
                        `¿Estás seguro de que deseas eliminar a ${studentName}?`, 
                        () => {
                            // Si confirma, ejecuta la eliminación
                            deleteStudent(groupKey, studentId, studentName);
                        }, 
                        () => {
                            // Si cancela, no hace nada
                            console.log("Eliminación cancelada");
                        }
                    );
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
    
    // Función para mostrar notificaciones personalizadas
    function showNotification(message, type = 'info') {
        // Crear el elemento de notificación
        const notification = $(`<div class="notification ${type}">
            <span class="message">${message}</span>
        </div>`);
        
        // Añadir al DOM
        $("body").append(notification);
        
        // Mostrar con animación
        notification.addClass('show');
        
        // Auto-ocultar después de 3 segundos
        setTimeout(() => {
            notification.removeClass('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Permitir cerrar manualmente
        notification.find('.close-btn').click(function() {
            notification.removeClass('show');
            setTimeout(() => notification.remove(), 300);
        });
    }
    
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
            // Redirigir a login.html solo si no estamos ya en ella
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    $("#profileIcon").click(function() {
        $("#profileMenu").toggle();
    });

    $("#logoutButton").click(function() {
        auth.signOut()
            .then(() => {
                showNotification('Sesión cerrada correctamente', 'success');
                window.location.href = 'login.html';
            })
            .catch((error) => {
                showNotification('Error al cerrar sesión: ' + error.message, 'error');
            });
    });

    // Si ya estamos autenticados, actualizar la barra lateral
    if (auth.currentUser) {
        updateSidebar();
    }
    $("#searchButton").click(function() {
        const query = $("#searchInput").val();
        searchStudents(query);
    });
    
    // Evento para buscar al presionar Enter en el campo de búsqueda
    $("#searchInput").keypress(function(e) {
        if (e.which === 13) { // Código de tecla Enter
            const query = $(this).val();
            searchStudents(query);
        }
    });
    
    // Evento para cerrar los resultados de búsqueda
    $("#closeSearchResults").click(function() {
        $("#search-results").hide();
        $("#searchInput").val('');
    });
    
    // Asegurarse de que los overlays de asistencia tengan eventos para volver a los resultados
    $("#attendanceMenuOverlay .close-btn, #attendanceHistoryOverlay .close-btn").click(function() {
        $(this).closest(".glass-effect").hide();
        $("#search-results").fadeIn(300);
    });
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
        
        // Mostrar con animación (usar setTimeout para asegurar que la transición funcione)
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
function createConfirmationDialog() {
    // Verificar si ya existe un diálogo
    if (document.querySelector('.custom-dialog-overlay')) {
        return;
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
    
    return {
        overlay,
        content,
        cancelBtn,
        confirmBtn
    };
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
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Elimina diacríticos (tildes, acentos)
}
function searchStudents(query) {
    if (!query || query.trim() === "") {
        showNotification("Por favor ingrese un término de búsqueda", "warning");
        return;
    }

    // Normalizar la consulta (quitar tildes y convertir a minúsculas)
    const normalizedQuery = normalizeText(query.trim());
    
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification("No hay usuario autenticado", "error");
        return;
    }

    // Mostrar indicador de carga
    $("#search-results-list").html('<p class="loading-message">Buscando...</p>');
    $("#search-results").show();

    const groupsRef = database.ref('users/' + user.uid + '/groups');
    groupsRef.once('value', (snapshot) => {
        const results = [];
        
        snapshot.forEach((groupSnapshot) => {
            const groupKey = groupSnapshot.key;
            const group = groupSnapshot.val();
            const groupName = group.name || 'Grupo sin nombre';
            
            if (group.students) {
                Object.keys(group.students).forEach((studentId) => {
                    const student = group.students[studentId];
                    
                    // Normalizar nombre y DNI del estudiante
                    const normalizedName = normalizeText(student.name);
                    const normalizedDni = normalizeText(student.dni);
                    
                    if (normalizedName.includes(normalizedQuery) || normalizedDni.includes(normalizedQuery)) {
                        results.push({
                            id: studentId,
                            name: student.name || 'Sin nombre',
                            dni: student.dni || 'Sin DNI',
                            group: groupName,
                            groupKey: groupKey
                        });
                    }
                });
            }
        });
        
        displaySearchResults(results);
    }).catch((error) => {
        console.error("Error en la búsqueda:", error);
        $("#search-results-list").html('<p class="loading-message">Error al realizar la búsqueda</p>');
    });
}

// Función para mostrar los resultados de búsqueda
function displaySearchResults(results) {
    const resultsContainer = $("#search-results-list");
    resultsContainer.empty();
    
    if (results.length === 0) {
        resultsContainer.html('<p class="loading-message">No se encontraron resultados</p>');
        return;
    }
    
    let html = '<div class="search-results-grid">';
    
    results.forEach((student, index) => {
        html += `
            <div class="search-result-item" style="animation-delay: ${index * 0.05}s">
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p><strong>DNI:</strong> ${student.dni}</p>
                    <p><strong>Grupo:</strong> ${student.group}</p>
                </div>
                <div class="student-actions">
                    <button class="mark-attendance-btn" data-student-id="${student.id}" 
                            data-student-name="${student.name}" data-group-name="${student.group}">
                        <i class="fas fa-clipboard-check"></i> Asistencia
                    </button>
                    <button class="view-history-btn" data-student-id="${student.id}" 
                            data-student-name="${student.name}" data-group-name="${student.group}">
                        <i class="fas fa-history"></i> Historial
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsContainer.html(html);
    
    // Eventos para los botones de los resultados
    $(".mark-attendance-btn").click(function() {
        const studentId = $(this).data("student-id");
        const studentName = $(this).data("student-name");
        const groupName = $(this).data("group-name");
        
        // Guardar referencia al estudiante y grupo actual
        currentStudent = {
            id: studentId,
            name: studentName
        };
        currentGroup = groupName;
        
        // Mostrar menú de asistencia
        $("#search-results").hide();
        $("#studentName").text(studentName);
        $("#historyStudentName").text(studentName);
        $("#attendanceMenuOverlay").fadeIn(300);
    });
    
    $(".view-history-btn").click(function() {
        const studentId = $(this).data("student-id");
        const studentName = $(this).data("student-name");
        const groupName = $(this).data("group-name");
        
        // Guardar referencia al estudiante y grupo actual
        currentStudent = {
            id: studentId,
            name: studentName
        };
        currentGroup = groupName;
        
        // Cargar y mostrar historial
        loadAttendanceHistory(studentId, groupName);
        $("#search-results").hide();
        $("#historyStudentName").text(studentName);
        $("#attendanceHistoryOverlay").fadeIn(300);
    });
    
    // Nuevo evento para el botón de gestionar estudiante
    $(".manage-student-btn").click(function() {
        const studentId = $(this).data("student-id");
        const studentName = $(this).data("student-name");
        const groupKey = $(this).data("group-key");
        
        // Guardar referencia al estudiante actual
        currentStudent = {
            id: studentId,
            name: studentName
        };
        
        // Mostrar la interfaz de gestión de estudiantes y seleccionar este estudiante
        showStudentManagement();
        // Pequeño retraso para asegurar que la interfaz esté cargada
        setTimeout(() => {
            showChangeGroupForm(groupKey, studentId);
        }, 300);
    });
    
}
// Add this function to your existing scripts2.js file
// Add this function to your existing scripts2.js file
// Updated mobile navigation JavaScript
function updateSidebar() {
    // Keep your original sidebar content and functionality
    $(".sidebar").html(`
        <h2>Menu</h2>
        <button>Gestionar asistencia</button>
        <button>Grupos a cargo</button>
        <button>Gestionar estudiantes</button>
        <button>Gestionar grupos</button>
        <button id="searchStudentsBtn">Buscar estudiantes</button>
        <button>Informes</button>
        <button>Info de cuenta</button>
        <button id="logoutButton" class="botonLogout">Cerrar Sesión</button>
    `);
    
    // Original button functionality 
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
        } else if (action === "Buscar estudiantes") {
            showSearchInterface();
        } else if (action === "Informes") {
            showReportsInterface() 
        } else if (action === "Info de cuenta") {
            showAccountInfo();
        } else if (action === "Cerrar Sesión") {
            auth.signOut()
                .then(() => {
                    showNotification('Sesión cerrada correctamente', 'success');
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    showNotification('Error al cerrar sesión: ' + error.message, 'error');
                });
        }
        
        // Close mobile menu on button click (only on mobile)
        if (window.innerWidth <= 768) {
            $('.mobile-nav-toggle').removeClass('active');
            $('.sidebar').removeClass('active');
            $('.mobile-backdrop').removeClass('active');
            $('body').removeClass('no-scroll');
        }
    });
    
    // Initialize mobile navigation
    initMobileNavigation();
}

// Make sure to call this function when the document is ready
$(document).ready(function() {
    // Initialize mobile navigation
    initMobileNavigation();
    
    // Handle window resize events
    $(window).on('resize', function() {
        // If viewport becomes desktop size while mobile menu is open, reset states
        if (window.innerWidth > 768) {
            $('.mobile-nav-toggle').removeClass('active');
            $('.sidebar').removeClass('active');
            $('.mobile-backdrop').removeClass('active');
            $('body').removeClass('no-scroll');
        }
    });
});

function initMobileNavigation() {
    // Add mobile navigation toggle button and backdrop to the DOM if they don't exist
    if (!$('.mobile-nav-toggle').length) {
        $('body').prepend(`
            <button class="mobile-nav-toggle">
                <div class="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>
            <div class="mobile-backdrop"></div>
        `);
    }
    
    // Toggle sidebar when hamburger is clicked
    $('.mobile-nav-toggle').off('click').on('click', function() {
        console.log('Mobile toggle clicked');
        $(this).toggleClass('active');
        $('.sidebar').toggleClass('active');
        $('.mobile-backdrop').toggleClass('active');
        $('body').toggleClass('no-scroll');
    });
    
    // Close sidebar when backdrop is clicked
    $('.mobile-backdrop').off('click').on('click', function() {
        $('.mobile-nav-toggle').removeClass('active');
        $('.sidebar').removeClass('active');
        $('.mobile-backdrop').removeClass('active');
        $('body').removeClass('no-scroll');
    });
}