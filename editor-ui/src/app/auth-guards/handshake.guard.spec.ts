import { TestBed } from '@angular/core/testing';

import { HandshakeGuard } from './handshake.guard';

describe('HandshakeGuard', () => {
  let guard: HandshakeGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(HandshakeGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
