import { Component, inject, OnInit, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelService } from '../model.service';
import { Controller, PartnerDTO } from '../controller';

interface PartnerInfo {
  partnerId: string;
  partnerName: string;
  transactionCount: number;
  hasTransactions: boolean;
}

@Component({
  selector: 'partners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss'
})
export class PartnersComponent implements OnInit {
  private modelService = inject(ModelService);
  private controller = inject(Controller);

  selectedJournalId: Signal<string | null> = this.modelService.selectedJournalId$;
  partners: PartnerInfo[] = [];
  sortColumn: 'partnerId' | 'partnerName' | 'transactionCount' = 'partnerName';
  sortDirection: 'asc' | 'desc' = 'asc';
  loading = false;
  error: string | null = null;

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
