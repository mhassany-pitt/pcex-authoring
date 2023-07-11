import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAuthCtrlComponent } from './user-auth-ctrl.component';

describe('UserAuthCtrlComponent', () => {
  let component: UserAuthCtrlComponent;
  let fixture: ComponentFixture<UserAuthCtrlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ UserAuthCtrlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAuthCtrlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
