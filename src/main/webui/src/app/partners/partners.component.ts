import { Component, inject, OnInit, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelService } from '../model.service';
import { Controller, PartnerDTO } from '../controller';
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
