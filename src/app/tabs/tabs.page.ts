import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  checkboxOutline,
  documentTextOutline,
  personCircleOutline,
  statsChartOutline,
} from 'ionicons/icons';

import { SessionStore } from '../core/state/session.store';

interface TabConfig {
  tab: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage {
  private readonly sessionStore = inject(SessionStore);

  readonly tabsDisponibles = computed<TabConfig[]>(() => {
    const rol = this.sessionStore.rolActual();

    switch (rol) {
      case 'CoordProvincial':
        return [
          { tab: 'dashboard', label: 'Resultados', icon: 'stats-chart-outline' },
          { tab: 'recintos', label: 'Recintos', icon: 'business-outline' },
          { tab: 'profile', label: 'Perfil', icon: 'person-circle-outline' },
        ];
      case 'CoordRecinto':
        return [
          { tab: 'mesas', label: 'Mesas JRV', icon: 'checkbox-outline' },
          { tab: 'dashboard', label: 'Resumen', icon: 'stats-chart-outline' },
          { tab: 'profile', label: 'Perfil', icon: 'person-circle-outline' },
        ];
      case 'Veedor':
      default:
        return [
          { tab: 'mis-mesas', label: 'Mis Mesas', icon: 'document-text-outline' },
          { tab: 'profile', label: 'Perfil', icon: 'person-circle-outline' },
        ];
    }
  });

  constructor() {
    addIcons({
      statsChartOutline,
      businessOutline,
      checkboxOutline,
      documentTextOutline,
      personCircleOutline,
    });
  }
}