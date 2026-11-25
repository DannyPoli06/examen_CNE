import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudOfflineOutline,
  cloudUploadOutline,
  syncOutline,
} from 'ionicons/icons';

import { SyncOfflineService } from '../../../core/services/sync-offline';

@Component({
  selector: 'app-ui-state-banner',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton, IonSpinner],
  templateUrl: './ui-state-banner.component.html',
  styleUrls: ['./ui-state-banner.component.scss'],
})
export class UiStateBannerComponent {
  readonly syncService = inject(SyncOfflineService);

  constructor() {
    addIcons({
      cloudOfflineOutline,
      cloudUploadOutline,
      syncOutline,
    });
  }

  async sincronizarAhora(): Promise<void> {
    await this.syncService.sincronizarPendientes();
  }
}