import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GptGenexplanationComponent } from './gpt-genexplanation.component';

describe('GptGenexplanationComponent', () => {
  let component: GptGenexplanationComponent;
  let fixture: ComponentFixture<GptGenexplanationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GptGenexplanationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GptGenexplanationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
