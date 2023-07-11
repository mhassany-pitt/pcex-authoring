import { TestBed } from '@angular/core/testing';

import { AuthenticatedAuthorGuard } from './authenticated-author.guard';

describe('AuthenticatedAuthorGuard', () => {
  let guard: AuthenticatedAuthorGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(AuthenticatedAuthorGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
