import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrarActaPage } from './registrar-acta.page';

describe('RegistrarActaPage', () => {
  let component: RegistrarActaPage;
  let fixture: ComponentFixture<RegistrarActaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrarActaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
