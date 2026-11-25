import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiStateBannerComponent } from './ui-state-banner.component';

describe('UiStateBannerComponent', () => {
  let component: UiStateBannerComponent;
  let fixture: ComponentFixture<UiStateBannerComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UiStateBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
