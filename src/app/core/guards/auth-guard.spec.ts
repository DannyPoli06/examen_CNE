import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { guardAutenticado } from './auth-guard';

describe('guardAutenticado', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => guardAutenticado(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be defined', () => {
    expect(executeGuard).toBeDefined();
  });
});
