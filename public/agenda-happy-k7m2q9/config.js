// Configuración de Firebase para la agenda de ARVI HAPPY.
// Pega aquí los datos de tu app web de Firebase
// (Consola de Firebase → Configuración del proyecto → Tus apps → SDK config).
// Estos datos NO son secretos: la seguridad la dan el login y las reglas de Firestore.
// Mientras apiKey diga "PEGAR_AQUI", la agenda funciona en MODO DEMO (datos de ejemplo, solo en este navegador).
export const firebaseConfig = {
  apiKey: 'PEGAR_AQUI',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

// Usuario que se escribe en la pantalla de ingreso → correo creado en Firebase Authentication.
// Las contraseñas NO van en este archivo: se definen solo en Firebase.
export const USERS = {
  arviadmin: 'arviadmin@arvi.cl',
  coniadmin: 'coniadmin@arvi.cl',
  bastianadmin: 'bastianadmin@arvi.cl',
}
