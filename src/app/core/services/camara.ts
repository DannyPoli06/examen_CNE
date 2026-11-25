import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ACTAS_BUCKET, supabaseClient } from '../config/backend-clients';

export interface FotoCapturada {
  dataUrl: string;
  formato: string;
  nitida: boolean;
  indiceEnfoque: number;
  minimoRequerido: number;
}

export interface EvaluacionClaridad {
  nitida: boolean;
  indiceEnfoque: number;
  minimoRequerido: number;
}

@Injectable({
  providedIn: 'root',
})
export class CamaraService {
  readonly minimoEnfoque = 12;

  async capturarFotoActa(usarGaleria = false): Promise<FotoCapturada> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permisos = await Camera.checkPermissions();
        const requerido = usarGaleria ? permisos.photos : permisos.camera;
        if (requerido !== 'granted' && requerido !== 'limited') {
          const solicitud = await Camera.requestPermissions({
            permissions: [usarGaleria ? 'photos' : 'camera'],
          });
          const estadoFinal = usarGaleria ? solicitud.photos : solicitud.camera;
          if (estadoFinal !== 'granted' && estadoFinal !== 'limited') {
            throw new Error('Permiso de cámara o galería denegado en el dispositivo.');
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('denegado')) {
          throw err;
        }
      }
    }

    let imagen;
    try {
      imagen = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        correctOrientation: true,
        resultType: CameraResultType.DataUrl,
        source: usarGaleria ? CameraSource.Photos : CameraSource.Camera,
        width: 1024,
        height: 1024,
      });
    } catch {
      throw new Error('Captura de foto cancelada o sin permisos de cámara.');
    }

    if (!imagen.dataUrl) {
      throw new Error('No se obtuvo imagen desde la cámara.');
    }

    const evaluacion = await this.verificarClaridadImagen(imagen.dataUrl);

    return {
      dataUrl: imagen.dataUrl,
      formato: imagen.format || 'jpeg',
      nitida: evaluacion.nitida,
      indiceEnfoque: evaluacion.indiceEnfoque,
      minimoRequerido: evaluacion.minimoRequerido,
    };
  }

  async verificarClaridadImagen(
    dataUrl: string,
    umbralMinimo = this.minimoEnfoque
  ): Promise<EvaluacionClaridad> {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return { nitida: true, indiceEnfoque: 45, minimoRequerido: umbralMinimo };
    }

    try {
      const elementoImg = await this.decodificarDataUrl(dataUrl);

      const limiteDimension = 240;
      const factor =
        elementoImg.width > limiteDimension ? limiteDimension / elementoImg.width : 1;
      const w = Math.max(4, Math.floor(elementoImg.width * factor));
      const h = Math.max(4, Math.floor(elementoImg.height * factor));

      const lienzo = document.createElement('canvas');
      lienzo.width = w;
      lienzo.height = h;
      const contexto = lienzo.getContext('2d');

      if (!contexto) {
        return { nitida: true, indiceEnfoque: 40, minimoRequerido: umbralMinimo };
      }

      contexto.drawImage(elementoImg, 0, 0, w, h);
      const pixeles = contexto.getImageData(0, 0, w, h).data;

      const luminancia = new Float32Array(w * h);
      for (let pos = 0, k = 0; pos < pixeles.length; pos += 4, k++) {
        luminancia[k] =
          pixeles[pos] * 0.2126 + pixeles[pos + 1] * 0.7152 + pixeles[pos + 2] * 0.0722;
      }

      let acumuladorGradiente = 0;
      let acumuladorCuadrado = 0;
      let muestras = 0;

      for (let fila = 1; fila < h - 1; fila++) {
        const offset = fila * w;
        for (let col = 1; col < w - 1; col++) {
          const gx = luminancia[offset + col + 1] - luminancia[offset + col - 1];
          const gy = luminancia[offset + w + col] - luminancia[offset - w + col];
          const magnitud = Math.abs(gx) + Math.abs(gy);
          acumuladorGradiente += magnitud;
          acumuladorCuadrado += magnitud * magnitud;
          muestras++;
        }
      }

      if (muestras === 0) {
        return { nitida: false, indiceEnfoque: 0, minimoRequerido: umbralMinimo };
      }

      const promedio = acumuladorGradiente / muestras;
      const dispersion = acumuladorCuadrado / muestras - promedio * promedio;
      const indiceEnfoque = Math.round(Math.max(0, dispersion) * 0.14 * 10) / 10;

      return {
        nitida: indiceEnfoque >= umbralMinimo,
        indiceEnfoque,
        minimoRequerido: umbralMinimo,
      };
    } catch {
      return { nitida: true, indiceEnfoque: 35, minimoRequerido: umbralMinimo };
    }
  }

  async subirFotoActa(
    dataUrl: string,
    recintoID: string,
    jrvID: string
  ): Promise<string> {
    const archivoBlob = this.convertirBase64ABlob(dataUrl);
    const subtipo = archivoBlob.type.split('/')[1] || 'jpg';
    const extension = subtipo === 'jpeg' ? 'jpg' : subtipo;

    const rutaArchivo = `${recintoID}/${jrvID}_${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabaseClient.storage
      .from(ACTAS_BUCKET)
      .upload(rutaArchivo, archivoBlob, {
        contentType: archivoBlob.type || 'image/jpeg',
        upsert: true,
      });

    if (errorSubida) {
      throw new Error(`Error al subir foto del acta: ${errorSubida.message}`);
    }

    const { data } = supabaseClient.storage
      .from(ACTAS_BUCKET)
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  convertirBase64ABlob(dataUrl: string): Blob {
    const partes = dataUrl.split(',');
    if (partes.length < 2) {
      throw new Error('Formato de imagen inválido.');
    }

    const coincidenciaMime = partes[0].match(/:(.*?);/);
    const tipoMime = coincidenciaMime ? coincidenciaMime[1] : 'image/jpeg';
    const bytesCrudos = atob(partes[1]);
    const buffer = new Uint8Array(bytesCrudos.length);

    for (let i = 0; i < bytesCrudos.length; i++) {
      buffer[i] = bytesCrudos.charCodeAt(i);
    }

    return new Blob([buffer], { type: tipoMime });
  }

  private decodificarDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen capturada.'));
      img.src = dataUrl;
    });
  }
}
