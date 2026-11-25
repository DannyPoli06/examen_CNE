import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ACTAS_BUCKET, supabaseClient } from '../config/backend-clients';

export interface FotoCapturada {
  dataUrl: string;
  formato: string;
}

@Injectable({
  providedIn: 'root',
})
export class CamaraService {
  async capturarFotoActa(usarGaleria = false): Promise<FotoCapturada> {
    if (Capacitor.isNativePlatform()) {
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
    }

    try {
      const imagen = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: usarGaleria ? CameraSource.Photos : CameraSource.Camera,
        width: 1600,
      });

      if (!imagen.dataUrl) {
        throw new Error('No se obtuvo imagen desde la cámara.');
      }

      return {
        dataUrl: imagen.dataUrl,
        formato: imagen.format || 'jpeg',
      };
    } catch (error) {
      throw new Error('Captura de foto cancelada o sin permisos de cámara.');
    }
  }

  async subirFotoActa(
    dataUrl: string,
    recintoID: string,
    jrvID: string
  ): Promise<string> {
    const respuesta = await fetch(dataUrl);
    const blob = await respuesta.blob();
    const extension = blob.type.split('/')[1] || 'jpg';

    const rutaArchivo = `${recintoID}/${jrvID}_${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabaseClient.storage
      .from(ACTAS_BUCKET)
      .upload(rutaArchivo, blob, {
        contentType: blob.type || 'image/jpeg',
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
}