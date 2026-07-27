import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';

@Component({
  selector: 'journal-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './journal-management.component.html',
  styleUrl: './journal-management.component.scss'
})
export class JournalManagementComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);

  journals: JournalMetadataDTO[] = [];
  selectedJournalId: string | null = null;
  selectedJournal: JournalMetadataDTO | null = null;
  includeTransactions = true;
  exporting = false;
  exportError: string | null = null;
  confirmationName = '';
  deleting = false;
  deleteError: string | null = null;

  constructor() {
    effect(() => {
      this.journals = this.modelService.journals$();
      this.selectedJournalId = this.modelService.selectedJournalId$();
      this.selectedJournal = this.journals.find(journal => journal.id === this.selectedJournalId) || null;
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.modelService.journals$().length === 0) {
      await this.controller.listJournals();
    }
  }

  async onJournalSelected(): Promise<void> {
    await this.controller.selectJournal(this.selectedJournalId);
  }

  importJournal(): void {
    this.router.navigate(['/upload']);
  }

  createJournal(): void {
    this.router.navigate(['/create-journal']);
  }

  get isConfirmationValid(): boolean {
    return this.selectedJournal !== null &&
           this.confirmationName === this.selectedJournal.title;
  }

  async exportJournal(): Promise<void> {
    if (!this.selectedJournal) return;

    this.exporting = true;
    this.exportError = null;

    try {
      const content = await this.controller.exportJournal(this.selectedJournal.id, this.includeTransactions);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = (this.selectedJournal.title || 'journal').replace(/[^a-zA-Z0-9]/g, '_') + '.journal';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      this.exportError = 'Failed to export journal: ' + (err?.error?.message ?? err.message);
    } finally {
      this.exporting = false;
    }
  }

  async deleteJournal(): Promise<void> {
    if (!this.selectedJournal || !this.isConfirmationValid) return;

    this.deleting = true;
    this.deleteError = null;

    try {
      await this.controller.deleteJournal(this.selectedJournal.id);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.deleteError = 'Failed to delete journal: ' + (err.message || 'Unknown error');
    } finally {
      this.deleting = false;
    }
  }

  cancelDelete(): void {
    this.confirmationName = '';
    this.deleteError = null;
  }
}
