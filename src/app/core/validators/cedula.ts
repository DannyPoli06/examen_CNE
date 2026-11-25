export function validarCedulaEcuador(cedula: string): boolean {
  const limpia = (cedula ?? '').trim();

//vrifica q la cedula sea de verdad

  if (!/^\d{10}$/.test(limpia)) {
    return false;
  }

  const provincia = Number(limpia.slice(0, 2));
  const provinciaValida = (provincia >= 1 && provincia <= 24) || provincia === 30;
  if (!provinciaValida) {
    return false;
  }

  const tercerDigito = Number(limpia.charAt(2));
  if (tercerDigito < 0 || tercerDigito > 5) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < coeficientes.length; i++) {
    let producto = Number(limpia.charAt(i)) * coeficientes[i];
    if (producto >= 10) {
      producto -= 9;
    }
    suma += producto;
  }

  const residuo = suma % 10;
  const digitoVerificadorEsperado = residuo === 0 ? 0 : 10 - residuo;
  const digitoVerificadorReal = Number(limpia.charAt(9));

  return digitoVerificadorEsperado === digitoVerificadorReal;
}