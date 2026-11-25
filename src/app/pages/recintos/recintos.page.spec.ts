import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { RecintosPage } from './recintos.page';

describe('RecintosPage', () => {
  let component: RecintosPage;
  let fixture: ComponentFixture<RecintosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecintosPage],
      providers: [
        { provide: ModalController, useValue: { create: vi.fn(), dismiss: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecintosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
