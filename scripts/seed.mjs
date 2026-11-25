import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

const envPath = resolve('.env');
if (!existsSync(envPath)) {
  console.error('No se encontró el archivo .env para conectar con la base.');
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

async function asegurarUsuario(email, clave = 'Ecuador2026') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, clave);
    return cred.user.uid;
  } catch {
    const cred = await signInWithEmailAndPassword(auth, email, clave);
    return cred.user.uid;
  }
}

async function poblarDatos() {
  console.log('Iniciando carga inicial de datos electorales en Firebase...');

  const cedProvincial = '1710000017';
  const cedProvincialAlt = '1713506374';
  const cedCoordRecinto = '1710000025';
  const cedVeedor1 = '1710000033';
  const cedVeedor2 = '1710000041';

  const correoProvincial = 'carlos.mendoza.cne2026@gmail.com';
  const correoProvincialAlt = 'danny.provincial.cne2026@gmail.com';
  const correoCoordRecinto = 'lucia.paredes.cne2026@gmail.com';
  const correoVeedor1 = 'andres.salazar.cne2026@gmail.com';
  const correoVeedor2 = 'valeria.torres.cne2026@gmail.com';

  const uidProvincial = await asegurarUsuario(correoProvincial, 'Ecuador2026');
  const uidProvincialAlt = await asegurarUsuario(correoProvincialAlt, 'Ecuador2026');
  const uidCoordRecinto = await asegurarUsuario(correoCoordRecinto, 'Ecuador2026');
  const uidVeedor1 = await asegurarUsuario(correoVeedor1, 'Ecuador2026');
  const uidVeedor2 = await asegurarUsuario(correoVeedor2, 'Ecuador2026');

  await signInWithEmailAndPassword(auth, correoProvincial, 'Ecuador2026');

  const usuariosExistentes = await getDocs(collection(db, 'usuarios'));
  const creadoPorUid = new Map();
  for (const d of usuariosExistentes.docs) {
    creadoPorUid.set(d.id, d.data().creadoEn || ahora);
  }

  await setDoc(doc(db, 'usuarios', uidProvincial), {
    uID: uidProvincial,
    cedula: cedProvincial,
    correo: correoProvincial,
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Loor',
    telefono: '0991234567',
    rol: 'CoordProvincial',
    provinciaID: '17',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: creadoPorUid.get(uidProvincial) || ahora,
  });

  const uidsValidos = new Set([
    uidProvincial,
    uidProvincialAlt,
    uidCoordRecinto,
    uidVeedor1,
    uidVeedor2,
  ]);
  for (const d of usuariosExistentes.docs) {
    if (!uidsValidos.has(d.id)) {
      await deleteDoc(doc(db, 'usuarios', d.id));
    }
  }

  await setDoc(doc(db, 'usuarios', uidProvincialAlt), {
    uID: uidProvincialAlt,
    cedula: cedProvincialAlt,
    correo: correoProvincialAlt,
    nombres: 'Daniel Andrés',
    apellidos: 'Díaz Bedón',
    telefono: '0998877665',
    rol: 'CoordRecinto',
    provinciaID: '17',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: creadoPorUid.get(uidProvincialAlt) || ahora,
  });

  await setDoc(doc(db, 'usuarios', uidCoordRecinto), {
    uID: uidCoordRecinto,
    cedula: cedCoordRecinto,
    correo: correoCoordRecinto,
    nombres: 'Lucía Elena',
    apellidos: 'Paredes Viteri',
    telefono: '0987654321',
    rol: 'CoordRecinto',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: creadoPorUid.get(uidCoordRecinto) || ahora,
  });

  await setDoc(doc(db, 'usuarios', uidVeedor1), {
    uID: uidVeedor1,
    cedula: cedVeedor1,
    correo: correoVeedor1,
    nombres: 'Andrés Marcelo',
    apellidos: 'Salazar Castro',
    telefono: '0971122334',
    rol: 'Veedor',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    jrvID: 'JRV-17-001-01M',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: creadoPorUid.get(uidVeedor1) || ahora,
  });

  await setDoc(doc(db, 'usuarios', uidVeedor2), {
    uID: uidVeedor2,
    cedula: cedVeedor2,
    correo: correoVeedor2,
    nombres: 'Valeria Patricia',
    apellidos: 'Torres Mora',
    telefono: '0969988776',
    rol: 'Veedor',
    provinciaID: '17',
    recintoID: 'REC-17-001',
    jrvID: 'JRV-17-001-01F',
    primeraVezAcceso: false,
    activo: true,
    creadoEn: creadoPorUid.get(uidVeedor2) || ahora,
  });

  // Limpiar documentos antiguos en listas y jrvs para evitar duplicados
  const listasExistentes = await getDocs(collection(db, 'listas'));
  for (const d of listasExistentes.docs) {
    await deleteDoc(doc(db, 'listas', d.id));
  }

  const jrvsExistentes = await getDocs(collection(db, 'jrvs'));
  for (const d of jrvsExistentes.docs) {
    await deleteDoc(doc(db, 'jrvs', d.id));
  }

  await setDoc(doc(db, 'recintos', 'REC-17-001'), {
    ID: 'REC-17-001',
    provinciaID: '17',
    canton: 'QUITO',
    parroquia: 'CALDERON (ZONA BICENTENARIO)',
    nombre: 'U.E. REPLICA JUAN PIO MONTUFAR',
    direccion: 'JUAN PIO MONTUFAR 18-71 Y TAJAMAR',
    totalJRVS: 2,
    coordinadorRecintoUID: uidCoordRecinto,
    coordinadorNombre: 'Lucía Elena Paredes Viteri',
    coordenadas: { lat: -0.0952, lng: -78.4215, precision: 10 },
  });

  await setDoc(doc(db, 'recintos', 'REC-17-002'), {
    ID: 'REC-17-002',
    provinciaID: '17',
    canton: 'QUITO',
    parroquia: 'INAQUITO',
    nombre: 'COLEGIO EXPERIMENTAL BENALCAZAR',
    direccion: 'AV. 6 DE DICIEMBRE Y PORTUGAL',
    totalJRVS: 2,
    coordenadas: { lat: -0.1807, lng: -78.4842, precision: 12 },
  });

  await setDoc(doc(db, 'jrvs', 'JRV-17-001-01M'), {
    ID: 'JRV-17-001-01M',
    recintoID: 'REC-17-001',
    nombreRecinto: 'U.E. REPLICA JUAN PIO MONTUFAR',
    numero: 1,
    genero: 'M',
    electores: 350,
    estado: 'Pendiente',
    veedorUID: uidVeedor1,
    veedorNombre: 'Andrés Marcelo Salazar Castro',
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
    veedorNombre: 'Valeria Patricia Torres Mora',
  });

  await setDoc(doc(db, 'jrvs', 'JRV-17-002-01M'), {
    ID: 'JRV-17-002-01M',
    recintoID: 'REC-17-002',
    nombreRecinto: 'COLEGIO EXPERIMENTAL BENALCAZAR',
    numero: 1,
    genero: 'M',
    electores: 350,
    estado: 'Pendiente',
  });

  await setDoc(doc(db, 'jrvs', 'JRV-17-002-01F'), {
    ID: 'JRV-17-002-01F',
    recintoID: 'REC-17-002',
    nombreRecinto: 'COLEGIO EXPERIMENTAL BENALCAZAR',
    numero: 1,
    genero: 'F',
    electores: 350,
    estado: 'Pendiente',
  });

  const listas = [
    {
      ID: 'ALC-01',
      dignidad: 'Alcalde',
      listaPerteneciente: '1',
      siglas: 'CD',
      nombrePartido: 'Movimiento Centro Democrático',
      candidato: 'Elena Villavicencio',
    },
    {
      ID: 'ALC-02',
      dignidad: 'Alcalde',
      listaPerteneciente: '2',
      siglas: 'UP',
      nombrePartido: 'Movimiento Unidad Popular',
      candidato: 'Roberto Cárdenas',
    },
    {
      ID: 'ALC-03',
      dignidad: 'Alcalde',
      listaPerteneciente: '5',
      siglas: 'RC',
      nombrePartido: 'Revolución Ciudadana',
      candidato: 'Pavel Muñoz',
    },
    {
      ID: 'ALC-04',
      dignidad: 'Alcalde',
      listaPerteneciente: '6',
      siglas: 'PSC',
      nombrePartido: 'Partido Social Cristiano',
      candidato: 'Diego Zambrano',
    },
    {
      ID: 'ALC-05',
      dignidad: 'Alcalde',
      listaPerteneciente: '21',
      siglas: 'CREO',
      nombrePartido: 'Movimiento CREO',
      candidato: 'Luz Marina Vega',
    },
    {
      ID: 'PREF-01',
      dignidad: 'Prefecto',
      listaPerteneciente: '1',
      siglas: 'CD',
      nombrePartido: 'Movimiento Centro Democrático',
      candidato: 'Andrea Hidalgo',
    },
    {
      ID: 'PREF-02',
      dignidad: 'Prefecto',
      listaPerteneciente: '2',
      siglas: 'UP',
      nombrePartido: 'Movimiento Unidad Popular',
      candidato: 'Natasha Rojas',
    },
    {
      ID: 'PREF-03',
      dignidad: 'Prefecto',
      listaPerteneciente: '5',
      siglas: 'RC',
      nombrePartido: 'Revolución Ciudadana',
      candidato: 'Paola Pabón',
    },
    {
      ID: 'PREF-04',
      dignidad: 'Prefecto',
      listaPerteneciente: '6',
      siglas: 'PSC',
      nombrePartido: 'Partido Social Cristiano',
      candidato: 'Guillermo Churuchumbi',
    },
    {
      ID: 'PREF-05',
      dignidad: 'Prefecto',
      listaPerteneciente: '21',
      siglas: 'CREO',
      nombrePartido: 'Movimiento CREO',
      candidato: 'Eduardo del Pozo',
    },
  ];

  for (const item of listas) {
    await setDoc(doc(db, 'listas', item.ID), item);
  }

  console.log('Datos iniciales cargados exitosamente.');
  process.exit(0);
}

poblarDatos().catch((err) => {
  console.error('Error al poblar datos iniciales:', err.message);
  process.exit(1);
});
