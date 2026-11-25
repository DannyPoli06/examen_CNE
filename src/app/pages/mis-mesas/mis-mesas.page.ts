import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-mis-mesas',
  templateUrl: './mis-mesas.page.html',
  styleUrls: ['./mis-mesas.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class MisMesasPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
