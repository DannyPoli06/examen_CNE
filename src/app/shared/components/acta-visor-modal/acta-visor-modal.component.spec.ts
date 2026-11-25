import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActaVisorModalComponent } from './acta-visor-modal.component';

describe('ActaVisorModalComponent', () => {
  let component: ActaVisorModalComponent;
  let fixture: ComponentFixture<ActaVisorModalComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActaVisorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
