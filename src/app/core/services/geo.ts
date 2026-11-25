import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { UbicacionGps } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class GeoService {
  async obtenerUbicacionActual(): Promise<UbicacionGps> {
    try {
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      return {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
        precision: Math.round(posicion.coords.accuracy),
      };
    } catch {
      return this.obtenerUbicacionNavegador();
    }
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
        reject(new Error('La geolocalización no está disponible en este dispositivo.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          resolve({
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
            precision: Math.round(posicion.coords.accuracy),
          });
        },
        () => {
          reject(
            new Error(
              'No se pudo obtener la ubicación GPS. Verifica que los permisos estén activos.'
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }
}