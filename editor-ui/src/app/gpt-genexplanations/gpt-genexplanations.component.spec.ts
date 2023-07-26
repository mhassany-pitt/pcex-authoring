import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GptGenexplanationsComponent } from './gpt-genexplanations.component';

describe('GptGenexplanationsComponent', () => {
  let component: GptGenexplanationsComponent;
  let fixture: ComponentFixture<GptGenexplanationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GptGenexplanationsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GptGenexplanationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
