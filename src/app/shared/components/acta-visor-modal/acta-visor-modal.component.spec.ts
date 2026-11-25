import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { ActaVisorModalComponent } from './acta-visor-modal.component';

describe('ActaVisorModalComponent', () => {
  let component: ActaVisorModalComponent;
  let fixture: ComponentFixture<ActaVisorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActaVisorModalComponent],
      providers: [
        { provide: ModalController, useValue: { create: vi.fn(), dismiss: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActaVisorModalComponent);
    component = fixture.componentInstance;
    component.acta = {
      ID: 'ACTA-JRV-17-001-01M-Alcalde',
      dignidad: 'Alcalde',
      recintoID: 'REC-17-001',
      nombreRecinto: 'Unidad Educativa Prueba',
      jrvID: 'JRV-17-001-01M',
      jrvNumero: 1,
      veedorUID: 'uid-1',
      veedorCedula: '1710000033',
      veedorNombre: 'Veedor Prueba',
      votosPorLista: [],
      votosBlancos: 0,
      votosNulos: 0,
      totalSufragantes: 100,
      totalCalculado: 100,
      fotoUrl: '',
      gps: { lat: -0.18, lng: -78.46, precision: 10 },
      estado: 'Validada',
      creadaEn: '',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
