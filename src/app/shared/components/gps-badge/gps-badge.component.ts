import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locationOutline, navigateOutline, warningOutline } from 'ionicons/icons';

import { UbicacionGps } from '../../../core/models/electoral.models';

@Component({
  selector: 'app-gps-badge',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './gps-badge.component.html',
  styleUrls: ['./gps-badge.component.scss'],
})
export class GpsBadgeComponent {
  readonly coordenadas = input<UbicacionGps | null | undefined>(null);

  readonly mapaUrl = computed(() => {
    const gps = this.coordenadas();
    if (!gps) return '';
    return `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=17/${gps.lat}/${gps.lng}`;
  });

  constructor() {
    addIcons({
      locationOutline,
      navigateOutline,
      warningOutline,
    });
  }
}