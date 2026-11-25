import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { MesasPage } from './mesas.page';

describe('MesasPage', () => {
  let component: MesasPage;
  let fixture: ComponentFixture<MesasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesasPage],
      providers: [
        { provide: ModalController, useValue: { create: vi.fn(), dismiss: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MesasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
