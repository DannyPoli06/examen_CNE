import { EstadoRegistroActa, VotoPorLista } from '../models/electoral.models';

//calcula si las actadas deben ser aprobadas, validadas o rechazadas

export interface ResultadoCuadreActa {
  totalCalculado: number;
  cuadraConSufragantes: boolean;
  excedeElectoresJrv: boolean;
  tieneValoresNegativos: boolean;
  estadoSugerido: EstadoRegistroActa;
  observacion?: string;
}

export function evaluarCuadreActa(params: {
  votosPorLista: VotoPorLista[];
  votosBlancos: number;
  votosNulos: number;
  totalSufragantes: number;
  electoresHabilitadosJrv: number;
}): ResultadoCuadreActa {
  const {
    votosPorLista,
    votosBlancos,
    votosNulos,
    totalSufragantes,
    electoresHabilitadosJrv,
  } = params;

  const tieneValoresNegativos =
    votosBlancos < 0 ||
    votosNulos < 0 ||
    totalSufragantes < 0 ||
    votosPorLista.some((item) => item.votos < 0);

  const sumaListas = votosPorLista.reduce(
    (acc, item) => acc + (Number.isFinite(item.votos) ? item.votos : 0),
    0
  );

  const totalCalculado =
    sumaListas +
    (Number.isFinite(votosBlancos) ? votosBlancos : 0) +
    (Number.isFinite(votosNulos) ? votosNulos : 0);

  const cuadraConSufragantes = totalCalculado === totalSufragantes;
  const excedeElectoresJrv =
    totalSufragantes > electoresHabilitadosJrv ||
    totalCalculado > electoresHabilitadosJrv;

  const motivos: string[] = [];

  if (tieneValoresNegativos) {
    motivos.push('Existen valores negativos en el escrutinio');
  }
  if (!cuadraConSufragantes) {
    motivos.push(
      `Total calculado (${totalCalculado}) no coincide con total de sufragantes (${totalSufragantes})`
    );
  }
  if (excedeElectoresJrv) {
    motivos.push(
      `El total supera los electores habilitados de la JRV (${electoresHabilitadosJrv})`
    );
  }

  const esValida = motivos.length === 0;

  return {
    totalCalculado,
    cuadraConSufragantes,
    excedeElectoresJrv,
    tieneValoresNegativos,
    estadoSugerido: esValida ? 'Validada' : 'Observada',
    observacion: esValida ? undefined : motivos.join(' | '),
  };
}