import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GpsBadgeComponent } from './gps-badge.component';

describe('GpsBadgeComponent', () => {
  let component: GpsBadgeComponent;
  let fixture: ComponentFixture<GpsBadgeComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GpsBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
