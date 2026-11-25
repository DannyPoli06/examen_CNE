export type RolSistema = 'CoordProvincial' | 'CoordRecinto' | 'Veedor';
export type EstadoMesa = 'Pendiente' | 'Registrada' | 'Observada';
export type EstadoRegistroActa = 'Validada' | 'Observada';
export type DignidadElectoral = 'Alcalde' | 'Prefecto';

export interface UbicacionGps {
  lat: number;
  lng: number;
  precision?: number;
}

export interface RecintoElectoral {
  ID: string;
  provinciaID: string;
  canton: string;
  parroquia: string;
  nombre: string;
  direccion: string;
  totalJRVS: number;
  coordinadorRecintoUID?: string;
  coordinadorNombre?: string;
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

export interface ListaCandidato {
  ID: string;
  dignidad: DignidadElectoral;
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
  dignidad: DignidadElectoral;
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

export interface UsuarioPerfil {
  uID: string;
  cedula: string;
  correo: string;
  nombres: string;
  apellidos?: string;
  telefono?: string;
  rol: RolSistema;
  provinciaID: string;
  recintoID?: string;
  jrvID?: string;
  primeraVezAcceso: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}