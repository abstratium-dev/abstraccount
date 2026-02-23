import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelService } from '../model.service';

interface PartnerInfo {
  partnerId: string;
  partnerName: string;
  transactionCount: number;
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

  partners: PartnerInfo[] = [];
  sortColumn: 'partnerId' | 'partnerName' | 'transactionCount' = 'partnerName';
  sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    this.loadPartners();
  }

  loadPartners() {
    const transactions = this.modelService.transactions$();
    
    // Extract unique partners from transactions
    const partnerMap = new Map<string, PartnerInfo>();
    
    for (const transaction of transactions) {
      if (transaction.partnerId) {
        if (!partnerMap.has(transaction.partnerId)) {
          partnerMap.set(transaction.partnerId, {
            partnerId: transaction.partnerId,
            partnerName: transaction.partnerName || transaction.partnerId,
            transactionCount: 0
          });
        }
        const partner = partnerMap.get(transaction.partnerId)!;
        partner.transactionCount++;
      }
    }
    
    this.partners = Array.from(partnerMap.values());
    this.sortPartners();
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
