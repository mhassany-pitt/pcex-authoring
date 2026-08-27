import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorialService } from './tutorial.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './tutorial-overlay.component.html',
  styleUrl: './tutorial-overlay.component.less'
})
export class TutorialOverlayComponent implements OnInit, OnDestroy {
  public actualPosition: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom';

  constructor(public tutorial: TutorialService) {}

  ngOnInit(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('scroll', this.onWindowScroll, true);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('scroll', this.onWindowScroll, true);
  }

  private onWindowResize = () => {
    if (this.tutorial.isActive) {
      this.tutorial.recalculateRect();
    }
  };

  private onWindowScroll = () => {
    if (this.tutorial.isActive) {
      this.tutorial.recalculateRect();
    }
  };

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.tutorial.isActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.tutorial.skip();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      this.tutorial.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.tutorial.prev();
    }
  }

  get popoverStyle(): { [key: string]: string } {
    if (!this.tutorial.spotlightRect || !this.tutorial.hasTargetElement) {
      this.actualPosition = 'center';
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const rect = this.tutorial.spotlightRect;
    const pos = this.tutorial.currentStep?.position || 'bottom';
    const popoverWidth = 380;
    const popoverHeight = 220;
    const margin = 22;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let computedPos: 'top' | 'bottom' | 'left' | 'right' | 'center' = pos;

    switch (pos) {
      case 'bottom':
        top = rect.top + rect.height + margin;
        left = rect.left + rect.width / 2 - popoverWidth / 2;
        // Flip to top if overflows bottom
        if (top + popoverHeight > vpHeight - 16) {
          top = Math.max(16, rect.top - popoverHeight - margin);
          computedPos = 'top';
        }
        break;

      case 'top':
        top = rect.top - popoverHeight - margin;
        left = rect.left + rect.width / 2 - popoverWidth / 2;
        // Flip to bottom if overflows top
        if (top < 16) {
          top = rect.top + rect.height + margin;
          computedPos = 'bottom';
        }
        break;

      case 'right':
        top = rect.top + rect.height / 2 - popoverHeight / 2;
        left = rect.left + rect.width + margin;
        // Flip to left if overflows right
        if (left + popoverWidth > vpWidth - 16) {
          left = Math.max(16, rect.left - popoverWidth - margin);
          computedPos = 'left';
        }
        break;

      case 'left':
        top = rect.top + rect.height / 2 - popoverHeight / 2;
        left = rect.left - popoverWidth - margin;
        // Flip to right if overflows left
        if (left < 16) {
          left = rect.left + rect.width + margin;
          computedPos = 'right';
        }
        break;

      case 'center':
      default:
        this.actualPosition = 'center';
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        };
    }

    // Keep horizontally within viewport
    left = Math.max(16, Math.min(left, vpWidth - popoverWidth - 16));
    // Keep vertically within viewport
    top = Math.max(16, Math.min(top, vpHeight - popoverHeight - 16));

    this.actualPosition = computedPos;

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed'
    };
  }
}
