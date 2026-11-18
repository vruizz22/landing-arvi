// Configuración de Firebase para la agenda de ARVI HAPPY.
// Pega aquí los datos de tu app web de Firebase
// (Consola de Firebase → Configuración del proyecto → Tus apps → SDK config).
// Estos datos NO son secretos: la seguridad la dan el login y las reglas de Firestore.
// Mientras apiKey diga "PEGAR_AQUI", la agenda funciona en MODO DEMO (datos de ejemplo, solo en este navegador).
export const firebaseConfig = {
  apiKey: 'AIzaSyARd_ydj-q5hgRH8nhOiOO9hDS6nBlicDs',
  authDomain: 'arvi-happy-agenda.firebaseapp.com',
  projectId: 'arvi-happy-agenda',
  storageBucket: 'arvi-happy-agenda.firebasestorage.app',
  messagingSenderId: '499932889592',
  appId: '1:499932889592:web:042a3c39bd5a220e3fd60d',
}

// Usuario que se escribe en la pantalla de ingreso → correo creado en Firebase Authentication.
// Las contraseñas NO van en este archivo: se definen solo en Firebase.
export const USERS = {
  arviadmin: 'arviadmin@arvi.cl',
  coniadmin: 'coniadmin@arvi.cl',
  bastianadmin: 'bastianadmin@arvi.cl',
}
