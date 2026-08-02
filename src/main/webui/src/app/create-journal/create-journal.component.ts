import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, JournalMetadataDTO } from '../controller';

@Component({
  selector: 'create-journal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journal.component.html',
  styleUrl: './create-journal.component.scss'
})
export class CreateJournalComponent {
  private controller = inject(Controller);
  private router = inject(Router);

  // Form fields
  logo: string = '';
  title: string = '';
  subtitle: string = '';
  currency: string = '';
  // UI state
  creating = false;
  createResult: JournalMetadataDTO | null = null;
  createError: string | null = null;

  async onSubmit() {
    this.creating = true;
    this.createResult = null;
    this.createError = null;

    try {
      const result = await this.controller.createJournal({
        logo: this.logo || null,
        title: this.title,
        subtitle: this.subtitle || null,
        currency: this.currency,
        commodities: {}
      });

      this.creating = false;
      this.createResult = result;
    } catch (error: any) {
      this.creating = false;
      this.createError = error.status === 403
        ? 'You do not have the required USER role to create a journal.'
        : error.error?.message || 'Failed to create journal';
    }
  }

  viewJournal() {
    if (this.createResult) {
      this.controller.selectJournal(this.createResult.id);
      this.router.navigate(['/journal']);
    }
  }

  viewAccounts() {
    if (this.createResult) {
      this.controller.selectJournal(this.createResult.id);
      this.router.navigate(['/accounts-table']);
    }
  }

  goToUpload() {
    this.router.navigate(['/upload']);
  }

  resetForm() {
    this.logo = '';
    this.title = '';
    this.subtitle = '';
    this.currency = '';
    this.createResult = null;
    this.createError = null;
  }
}
