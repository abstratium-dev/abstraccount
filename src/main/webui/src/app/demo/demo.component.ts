import { Component, inject, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../core/toast/toast.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { Demo, ModelService } from '../model.service';
import { Controller } from '../controller';

@Component({
  selector: 'app-demo',
  imports: [CommonModule, FormsModule],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss'
})
export class DemoComponent implements OnInit {
  private modelService = inject(ModelService);
  private controller = inject(Controller);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmDialogService);

  demos: Signal<Demo[]> = this.modelService.demos$;
  loading: Signal<boolean> = this.modelService.demosLoading$;
  error: Signal<string | null> = this.modelService.demosError$;

  // Add Demo Form state
  showAddForm = false;
  formSubmitting = false;
  formError: string | null = null;

  ngOnInit(): void {
    this.controller.loadDemos();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.formError = null;
    }
  }

  onRetry(): void {
    this.controller.loadDemos();
  }

  async onSubmitAdd(): Promise<void> {
    this.formSubmitting = true;
    this.formError = null;

    try {
      await this.controller.createDemo();
      this.toastService.success('Demo item created successfully');
      this.showAddForm = false;
    } catch (err: any) {
      this.formError = 'Failed to create demo item. Please try again.';
    } finally {
      this.formSubmitting = false;
    }
  }

  async deleteDemo(demo: Demo): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Demo Item',
      message: 'Are you sure you want to delete this demo item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.controller.deleteDemo(demo.id);
      this.toastService.success('Demo item deleted successfully');
    } catch (err: any) {
      this.toastService.error('Failed to delete demo item. Please try again.');
    }
  }
}
