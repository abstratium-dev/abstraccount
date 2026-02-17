import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);

  selectedJournal: JournalMetadataDTO | null = null;
  confirmationName: string = '';
  deleting = false;
  error: string | null = null;

  constructor() {
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      const journals = this.modelService.journals$();
      
      if (journalId && journals.length > 0) {
        this.selectedJournal = journals.find(j => j.id === journalId) || null;
      } else {
        this.selectedJournal = null;
      }
    });
  }

  get isConfirmationValid(): boolean {
    return this.selectedJournal !== null && 
           this.confirmationName === this.selectedJournal.title;
  }

  async deleteJournal(): Promise<void> {
    if (!this.selectedJournal || !this.isConfirmationValid) return;

    this.deleting = true;
    this.error = null;

    try {
      await this.controller.deleteJournal(this.selectedJournal.id);
      
      // Clear selection and navigate to home
      this.controller.setSelectedJournalId(null);
      this.controller.clearAccounts();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error = 'Failed to delete journal: ' + (err.message || 'Unknown error');
      this.deleting = false;
    }
  }

  cancel(): void {
    this.confirmationName = '';
    this.error = null;
  }
}
