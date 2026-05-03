import { Component, OnInit, AfterViewInit, OnDestroy, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Controller, JournalMetadataDTO, JournalKpiDTO } from '../controller';
import { ModelService } from '../model.service';

interface JournalHistoryEntry {
  journal: JournalMetadataDTO;
  kpi: JournalKpiDTO | null;
  kpiLoading: boolean;
  kpiError: boolean;
}

@Component({
  selector: 'journal-history',
  imports: [CommonModule],
  templateUrl: './journal-history.component.html',
  styleUrl: './journal-history.component.scss'
})
export class JournalHistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);
  private el = inject(ElementRef);
  private resizeObserver: ResizeObserver | null = null;

  entries: JournalHistoryEntry[] = [];
  selectedJournalId: string | null = null;
  loading = false;
  error = '';

  ngAfterViewInit(): void {
    this.equaliseHeaderHeights();
    this.resizeObserver = new ResizeObserver(() => this.equaliseHeaderHeights());
    this.resizeObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  equaliseHeaderHeights(): void {
    const headers: HTMLElement[] = Array.from(
      this.el.nativeElement.querySelectorAll('.tile-header')
    );
    if (headers.length < 2) return;
    headers.forEach(h => (h.style.minHeight = ''));
    const maxHeight = Math.max(...headers.map(h => h.getBoundingClientRect().height));
    headers.forEach(h => (h.style.minHeight = maxHeight + 'px'));
  }

  async ngOnInit(): Promise<void> {
    const selectedId = this.modelService.getSelectedJournalId();
    if (!selectedId) {
      this.error = 'No journal selected.';
      return;
    }
    this.selectedJournalId = selectedId;
    this.loading = true;
    try {
      const allJournals = this.modelService.journals$();
      const chain = this.buildChain(selectedId, allJournals);
      this.entries = chain.map(j => ({ journal: j, kpi: null, kpiLoading: true, kpiError: false }));
      await Promise.all(this.entries.map(e => this.loadKpi(e)));
    } catch (err) {
      console.error('Error loading journal history:', err);
      this.error = 'Failed to load journal history.';
    } finally {
      this.loading = false;
      setTimeout(() => this.equaliseHeaderHeights());
    }
  }

  private buildChain(currentId: string, all: JournalMetadataDTO[]): JournalMetadataDTO[] {
    const byId = new Map(all.map(j => [j.id, j]));
    const byPrevId = new Map(all.filter(j => j.previousJournalId).map(j => [j.previousJournalId!, j]));
    const chain: JournalMetadataDTO[] = [];
    const visited = new Set<string>();

    // Walk backwards to the oldest ancestor
    let current = byId.get(currentId);
    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current = current.previousJournalId ? byId.get(current.previousJournalId) : undefined;
    }

    // Walk forwards to any successors
    let next = byPrevId.get(chain[chain.length - 1]?.id ?? currentId);
    while (next && !visited.has(next.id)) {
      chain.push(next);
      visited.add(next.id);
      next = byPrevId.get(next.id);
    }

    return chain;
  }

  private async loadKpi(entry: JournalHistoryEntry): Promise<void> {
    try {
      entry.kpi = await this.controller.getJournalKpi(entry.journal.id);
    } catch {
      entry.kpiError = true;
    } finally {
      entry.kpiLoading = false;
    }
  }

  formatAmount(value: number | null | undefined, currency: string): string {
    if (value == null) return '—';
    return new Intl.NumberFormat(undefined, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' ' + currency;
  }

  netAssets(kpi: JournalKpiDTO): number {
    return kpi.totalAssets + kpi.totalLiabilities;
  }

  profitLoss(kpi: JournalKpiDTO): number {
    return -(kpi.totalRevenue + kpi.totalExpenses);
  }

  selectJournal(journalId: string): void {
    this.controller.selectJournal(journalId);
    this.router.navigate(['/journal']);
  }
}
