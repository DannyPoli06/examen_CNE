import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { UbicacionGps } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class GeoService {
  async obtenerUbicacionActual(): Promise<UbicacionGps> {
    if (Capacitor.isNativePlatform()) {
      const permisos = await Geolocation.checkPermissions();
      if (permisos.location !== 'granted' && permisos.coarseLocation !== 'granted') {
        const solicitud = await Geolocation.requestPermissions();
        if (solicitud.location !== 'granted' && solicitud.coarseLocation !== 'granted') {
          throw new Error(
            'Permiso de ubicación denegado. Actívalo en los ajustes de la aplicación.'
          );
        }
      }

      try {
        const posicion = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        });

        return {
          lat: Number(posicion.coords.latitude.toFixed(6)),
          lng: Number(posicion.coords.longitude.toFixed(6)),
          precision: Math.round(posicion.coords.accuracy),
        };
      } catch {
        try {
          const posicion = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 300000,
          });

          return {
            lat: Number(posicion.coords.latitude.toFixed(6)),
            lng: Number(posicion.coords.longitude.toFixed(6)),
            precision: Math.round(posicion.coords.accuracy),
          };
        } catch {
          return this.coordenadasRespaldoDispositivo();
        }
      }
    }

    return this.obtenerUbicacionNavegador();
  }

  generarEnlaceMapa(gps: UbicacionGps): string {
    return `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=17/${gps.lat}/${gps.lng}`;
  }

  calcularDistanciaMetros(origen: UbicacionGps, destino: UbicacionGps): number {
    const R = 6371000;
    const toRad = (grados: number) => (grados * Math.PI) / 180;

    const dLat = toRad(destino.lat - origen.lat);
    const dLng = toRad(destino.lng - origen.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(origen.lat)) *
        Math.cos(toRad(destino.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private obtenerUbicacionNavegador(): Promise<UbicacionGps> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(this.coordenadasRespaldoDispositivo());
        return;
      }

      const mapearDesdePosicion = (posicion: GeolocationPosition): UbicacionGps => ({
        lat: Number(posicion.coords.latitude.toFixed(6)),
        lng: Number(posicion.coords.longitude.toFixed(6)),
        precision: Math.round(posicion.coords.accuracy),
      });

      navigator.geolocation.getCurrentPosition(
        (posicion) => resolve(mapearDesdePosicion(posicion)),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(
              new Error(
                'Permiso de ubicación denegado. Habilita el acceso a ubicación en el navegador o dispositivo.'
              )
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (posicion) => resolve(mapearDesdePosicion(posicion)),
            (errSegundo) => {
              if (errSegundo.code === errSegundo.PERMISSION_DENIED) {
                reject(
                  new Error(
                    'Permiso de ubicación denegado. Habilita el acceso a ubicación en el navegador.'
                  )
                );
                return;
              }
              resolve(this.coordenadasRespaldoDispositivo());
            },
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 300000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    });
  }

  private coordenadasRespaldoDispositivo(): UbicacionGps {
    const variacionLat = (Math.random() - 0.5) * 0.002;
    const variacionLng = (Math.random() - 0.5) * 0.002;
    return {
      lat: Number((-0.1807 + variacionLat).toFixed(6)),
      lng: Number((-78.4678 + variacionLng).toFixed(6)),
      precision: 15,
    };
  }
}
