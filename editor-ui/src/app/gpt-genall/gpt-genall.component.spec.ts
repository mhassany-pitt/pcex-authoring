import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GptGenallComponent } from './gpt-genall.component';

describe('GptGenallComponent', () => {
  let component: GptGenallComponent;
  let fixture: ComponentFixture<GptGenallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GptGenallComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GptGenallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
