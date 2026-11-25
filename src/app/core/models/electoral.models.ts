// Tipos base de estado y perfiles del sistema electoral
export type RolSistema = 'CoordProvincial' | 'CoordRecinto' | 'Veedor';
export type EstadoMesa = 'Pendiente' | 'Registrada' | 'Observada';
export type EstadoRegistroActa = 'Validada' | 'Observada';

export interface UbicacionGps {
  lat: number;
  lng: number;
  precision?: number;
}

// 1. Recintos y Juntas Receptoras del Voto (JRV)
export interface RecintoElectoral {
  ID: string;
  provinciaID: string;
  canton: string;
  parroquia: string;
  nombre: string;
  direccion: string;
  totalJRVS: number;
  coordinadorRecintoUID?: string;
  coordenadas?: UbicacionGps;
}

export interface JrvMesa {
  ID: string;
  recintoID: string;
  nombreRecinto: string;
  numero: number;
  genero: 'M' | 'F';
  electores: number;
  estado: EstadoMesa;
  veedorUID?: string;
  veedorNombre?: string;
  actaID?: string;
}

// 2. Listas / Candidatos y Actas de Escrutinio
export interface ListaCandidato {
  ID: string;
  listaPerteneciente: string;
  siglas: string;
  nombrePartido: string;
  candidato: string;
}

export interface VotoPorLista {
  listaID: string;
  listaPerteneciente: string;
  siglas: string;
  votos: number;
}

export interface ActaElectoral {
  ID?: string;
  recintoID: string;
  nombreRecinto: string;
  jrvID: string;
  jrvNumero: number;
  veedorUID: string;
  veedorCedula: string;
  veedorNombre: string;
  votosPorLista: VotoPorLista[];
  votosBlancos: number;
  votosNulos: number;
  totalSufragantes: number;
  totalCalculado: number;
  fotoUrl: string;
  gps: UbicacionGps;
  estado: EstadoRegistroActa;
  observacion?: string;
  sincronizadaOffline?: boolean;
  creadaEn: string;
}

// 3. Usuarios del sistema
export interface UsuarioPerfil {
  uID: string;
  cedula: string;
  nombres: string;
  rol: RolSistema;
  provinciaID: string;
  recintoID?: string;
  jrvID?: string;
  primeraVezAcceso: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}