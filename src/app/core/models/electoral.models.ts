// Tipos base de estado y perfiles del sistema electoral
export type RolSistema = 'CoordProvincial' | 'CoordRecinto' | 'Veedor';
export type EstadoMesa = 'Pendiente' | 'Registrada' | 'Observada';
export type EstadoRegistroActa = 'Validada' | 'Observada';

export interface UbicacionGps {
  lat: number;
  lng: number;
  precision?: number;
}

// 1. (JRV)
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

// 2. Organizaciones políticas y las actas de escrutinio
export interface OrganizacionPolitica {
  ID: string;
  listaPerteneciente: string;
  siglas: string;
  nombre: string;
  candidato: string;
}

export interface VotoOrganizacion {
  organizacionID: string;
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
  votosOrganizaciones: VotoOrganizacion[];
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

// 3. Usuarios 
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