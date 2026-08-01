import { Component, inject, OnInit, Signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelService } from '../model.service';
import { Controller, PartnerDTO } from '../controller';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../core/toast/toast.service';

interface PartnerInfo {
  partnerId: string;
  partnerName: string;
  transactionCount: number;
  hasTransactions: boolean;
}

@Component({
  selector: 'partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss'
})
export class PartnersComponent implements OnInit {
  private modelService = inject(ModelService);
  private controller = inject(Controller);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);

  selectedJournalId: Signal<string | null> = this.modelService.selectedJournalId$;
  partners: PartnerInfo[] = [];
  sortColumn: 'partnerId' | 'partnerName' | 'transactionCount' = 'partnerName';
  sortDirection: 'asc' | 'desc' = 'asc';
  loading = false;
  error: string | null = null;

  // Add partner form state
  showAddForm = false;
  newPartnerName = '';
  addingPartner = false;

  // Import partners state
  importingPartners = false;
  @ViewChild('partnerFileInput') partnerFileInput?: ElementRef<HTMLInputElement>;

  readonly globalFilter: string = (() => {
    try { return localStorage.getItem('abstraccount:globalEql') ?? ''; } catch { return ''; }
  })();

  constructor() {
    // React to changes in selected journal and transactions
    effect(() => {
      const journalId = this.selectedJournalId();
      // Also track transactions to reload when they change
      const transactions = this.modelService.transactions$();

      if (journalId) {
        this.loadPartners();
      } else {
        this.partners = [];
      }
    });
  }

  ngOnInit() {
    // Partners will be loaded by the effect when journal is available
  }

  async loadPartners() {
    this.loading = true;
    this.error = null;

    try {
      // Load all partners from backend
      const allPartners = await this.controller.searchPartners('');

      // Get transaction counts from loaded transactions
      const transactions = this.modelService.transactions$();
      const transactionCountMap = new Map<string, number>();

      for (const transaction of transactions) {
        if (transaction.partnerId) {
          transactionCountMap.set(
            transaction.partnerId,
            (transactionCountMap.get(transaction.partnerId) || 0) + 1
          );
        }
      }

      // Combine partner data with transaction counts
      this.partners = allPartners.map(partner => ({
        partnerId: partner.partnerNumber,
        partnerName: partner.name,
        transactionCount: transactionCountMap.get(partner.partnerNumber) || 0,
        hasTransactions: transactionCountMap.has(partner.partnerNumber)
      }));

      this.sortPartners();
    } catch (err) {
      console.error('Failed to load partners:', err);
      this.error = 'Failed to load partners';
      this.partners = [];
    } finally {
      this.loading = false;
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.newPartnerName = '';
    }
  }

  async onAddPartner() {
    const name = this.newPartnerName.trim();
    if (!name) {
      return;
    }

    this.addingPartner = true;
    try {
      const result = await this.controller.createPartner(name);

      // Show warnings (e.g. duplicate name) as orange toast
      for (const warning of result.warnings) {
        this.toastService.warning(warning);
      }

      if (result.warnings.length === 0) {
        this.toastService.success(`Partner ${result.partnerNumber} created: ${result.name}`);
      }

      // Reset form
      this.showAddForm = false;
      this.newPartnerName = '';

      // Reload partners list
      await this.loadPartners();
    } catch (err) {
      console.error('Failed to create partner:', err);
      this.toastService.error('Failed to create partner');
    } finally {
      this.addingPartner = false;
    }
  }

  onColumnSort(column: 'partnerId' | 'partnerName' | 'transactionCount') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortPartners();
  }

  /**
   * Triggered when the user clicks the "Import CSV" button.
   * Opens the hidden file input dialog.
   */
  onImportClick() {
    this.partnerFileInput?.nativeElement.click();
  }

  /**
   * Triggered when the user selects a file in the import file input.
   * Asks for confirmation, warning about the consequences, then reads
   * the file and uploads its content to the backend.
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Replace All Partners?',
      message:
        'Are you sure you want to replace ALL existing partners with the contents of this file?\n\n' +
        'WARNING: This will overwrite every partner in your organisation. ' +
        'Transactions only store the partner number, not a reference to the partner. ' +
        'After replacing the partners, existing transactions may suddenly refer to ' +
        'different partner names than they did before if you have changed their names ' +
        'or number assignment, because the transactions only know ' +
        'the partner number.\n\n' +
        'This action cannot be undone.',
      confirmText: 'Replace All Partners',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
    });

    if (!confirmed) {
      // Reset the input so the same file can be selected again later
      input.value = '';
      return;
    }

    this.importingPartners = true;
    try {
      const csvContent = await file.text();

      const result = await this.controller.importPartners(csvContent);

      if (result.errors && result.errors.length > 0) {
        const errorList = result.errors.join('\n');
        this.toastService.error(`Import failed with ${result.errors.length} error(s):\n${errorList}`);
      } else {
        this.toastService.success(`Imported ${result.importedCount} partner(s).`);
        await this.loadPartners();
      }
    } catch (err) {
      console.error('Failed to import partners:', err);
      this.toastService.error('Failed to import partners');
    } finally {
      this.importingPartners = false;
      // Reset the input so the same file can be selected again later
      input.value = '';
    }
  }

  private sortPartners() {
    this.partners.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (this.sortColumn) {
        case 'partnerId':
          aVal = a.partnerId;
          bVal = b.partnerId;
          break;
        case 'partnerName':
          aVal = a.partnerName;
          bVal = b.partnerName;
          break;
        case 'transactionCount':
          aVal = a.transactionCount;
          bVal = b.transactionCount;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aVal - bVal;
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }
    });
  }

  getSortIndicator(column: string): string {
    if (this.sortColumn !== column) {
      return '';
    }
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }
}
