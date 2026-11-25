import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const envPath = resolve('.env');
if (!existsSync(envPath)) {
  console.error('no se encontró el archivo .env para pdoer ingresare a la base.');
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const app = initializeApp({
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);
const ahora = new Date().toISOString();

async function asegurarUsuario(cedula) {
  const email = `${cedula}@cne.gob.ec`;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, 'Ecuador2026');
    return cred.user.uid;
  } catch {
    const cred = await signInWithEmailAndPassword(auth, email, 'Ecuador2026');
    return cred.user.uid;
  }
}

async function poblarDatos() {
  console.log('Iniciando carga inicial en Firebase...');

  const uidProvincial = await asegurarUsuario('1710000001');
  const uidCoordRecinto = await asegurarUsuario('1710000002');
  const uidVeedor1 = await asegurarUsuario('1710000003');
  const uidVeedor2 = await asegurarUsuario('1710000004');

  await signInWithEmailAndPassword(auth, '1710000001@cne.gob.ec', 'Ecuador2026');

  // 1. Usuarios (3 roles principales)
  await setDoc(doc(db, 'usuarios', uidProvincial), {
    uID: uidProvincial,
    cedula: '1710000001',
    nombres: 'Carlos Mendoza',
    rol: 'CoordProvincial',
    provinciaID: '17',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: ahora,
  });

  await setDoc(doc(db, 'usuarios', uidCoordRecinto), {
    uID: uidCoordRecinto,
    cedula: '1710000002',
    nombres: 'Lucía Paredes',
    rol: 'CoordRecinto',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    primeraVezAcceso: true,
    activo: true,
    creadoEn: ahora,
  });

  await setDoc(doc(db, 'usuarios', uidVeedor1), {
    uID: uidVeedor1,
    cedula: '1710000003',
    nombres: 'Andrés Salazar',
    rol: 'Veedor',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    jrvID: 'JRV-17-001-01M',
    primeraVezAcceso: true,
    activo: true,
    creadoEn: ahora,
  });

  await setDoc(doc(db, 'usuarios', uidVeedor2), {
    uID: uidVeedor2,
    cedula: '1710000004',
    nombres: 'Valeria Torres',
    rol: 'Veedor',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    jrvID: 'JRV-17-001-01F',
    primeraVezAcceso: true,
    activo: true,
    creadoEn: ahora,
  });

  // 2. Recinto basado en tu hoja de consulta CNE
  await setDoc(doc(db, 'recintos', 'REC-17-001'), {
    ID: 'REC-17-001',
    provinciaID: '17',
    canton: 'QUITO',
    parroquia: 'CALDERON (ZONA BICENTENARIO)',
    nombre: 'U.E. REPLICA JUAN PIO MONTUFAR',
    direccion: 'JUAN PIO MONTUFAR 18-71 Y TAJAMAR',
    totalJRVS: 2,
    coordinadorRecintoUID: uidCoordRecinto,
    coordenadas: { lat: -0.0952, lng: -78.4215 },
  });

  // 3. Mesas / JRV del recinto
  await setDoc(doc(db, 'jrvs', 'JRV-17-001-01M'), {
    ID: 'JRV-17-001-01M',
    recintoID: 'REC-17-001',
    nombreRecinto: 'U.E. REPLICA JUAN PIO MONTUFAR',
    numero: 1,
    genero: 'M',
    electores: 350,
    estado: 'Pendiente',
    veedorUID: uidVeedor1,
    veedorNombre: 'Andrés Salazar',
  });

  await setDoc(doc(db, 'jrvs', 'JRV-17-001-01F'), {
    ID: 'JRV-17-001-01F',
    recintoID: 'REC-17-001',
    nombreRecinto: 'U.E. REPLICA JUAN PIO MONTUFAR',
    numero: 1,
    genero: 'F',
    electores: 348,
    estado: 'Pendiente',
    veedorUID: uidVeedor2,
    veedorNombre: 'Valeria Torres',
  });

  // 4. Listas y candidatos
  const listas = [
    { ID: 'LISTA-01', listaPerteneciente: 'Lista 1', siglas: 'MUP', nombrePartido: 'Movimiento Unidad Popular', candidato: 'Elena Villavicencio' },
    { ID: 'LISTA-02', listaPerteneciente: 'Lista 2', siglas: 'ANP', nombrePartido: 'Alianza Nacional Progresista', candidato: 'Roberto Cárdenas' },
    { ID: 'LISTA-03', listaPerteneciente: 'Lista 3', siglas: 'FCD', nombrePartido: 'Frente Ciudadano Democrático', candidato: 'Sofía Montalvo' },
    { ID: 'LISTA-04', listaPerteneciente: 'Lista 4', siglas: 'IRE', nombrePartido: 'Izquierda Renovadora Ecuatoriana', candidato: 'Diego Zambrano' },
  ];

  for (const item of listas) {
    await setDoc(doc(db, 'listas', item.ID), item);
  }

  console.log('Datos por default agregados :D.');
  process.exit(0);
}

poblarDatos().catch((err) => {
  console.error(' No valio :', err.message);
  process.exit(1);
});