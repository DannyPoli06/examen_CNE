import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisMesasPage } from './mis-mesas.page';

describe('MisMesasPage', () => {
  let component: MisMesasPage;
  let fixture: ComponentFixture<MisMesasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisMesasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
