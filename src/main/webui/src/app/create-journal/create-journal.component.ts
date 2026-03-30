import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, JournalMetadataDTO } from '../controller';

interface CommodityInput {
  code: string;
  precision: string;
}

@Component({
  selector: 'create-journal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journal.component.html',
  styleUrl: './create-journal.component.scss'
})
export class CreateJournalComponent {
  private controller = inject(Controller);
  private router = inject(Router);

  // Expose Object for template
  Object = Object;

  // Form fields
  logo: string = '';
  title: string = '';
  subtitle: string = '';
  currency: string = '';
  commodities: CommodityInput[] = [];

  // UI state
  creating = false;
  createResult: JournalMetadataDTO | null = null;
  createError: string | null = null;

  addCommodity() {
    this.commodities.push({ code: '', precision: '1000.00' });
  }

  removeCommodity(index: number) {
    this.commodities.splice(index, 1);
  }

  async onSubmit() {
    this.creating = true;
    this.createResult = null;
    this.createError = null;

    try {
      // Convert commodities array to map
      const commoditiesMap: { [key: string]: string } = {};
      for (const commodity of this.commodities) {
        if (commodity.code && commodity.precision) {
          commoditiesMap[commodity.code] = commodity.precision;
        }
      }

      const result = await this.controller.createJournal({
        logo: this.logo || null,
        title: this.title,
        subtitle: this.subtitle || null,
        currency: this.currency,
        commodities: commoditiesMap
      });

      this.creating = false;
      this.createResult = result;
    } catch (error: any) {
      this.creating = false;
      this.createError = error.error?.message || 'Failed to create journal';
    }
  }

  viewJournal() {
    if (this.createResult) {
      this.controller.selectJournal(this.createResult.id);
      this.router.navigate(['/journal']);
    }
  }

  resetForm() {
    this.logo = '';
    this.title = '';
    this.subtitle = '';
    this.currency = '';
    this.commodities = [];
    this.createResult = null;
    this.createError = null;
  }
}
