import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'ux-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  private toastService = inject(ToastService);
  
  toasts = this.toastService.toasts$;

  close(id: number): void {
    this.toastService.remove(id);
  }

  executeAction(toast: Toast): void {
    if (toast.action) {
      toast.action.callback();
      // Optionally close the toast after action is executed
      this.close(toast.id);
    }
  }
}
