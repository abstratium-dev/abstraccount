import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountService } from '../account.service';
import { AttachmentDTO, Controller, JournalMetadataDTO, TransactionDTO, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { FilterInputComponent } from './filter-input/filter-input.component';
import { TransactionEditModalComponent } from '../transaction-edit-modal/transaction-edit-modal.component';
import { InfoDialogService } from '../core/info-dialog/info-dialog.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'journal',
  imports: [CommonModule, RouterLink, FilterInputComponent, TransactionEditModalComponent],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  selectedJournal: JournalMetadataDTO | null = null;
  transactions: TransactionDTO[] = [];
  loading = false;
  error: string | null = null;
  tags: TagDTO[] = [];
  
  // Filter — pre-load from storage so the effect and FilterInputComponent agree on the initial value
  filterString: string = (() => {
    try {
      const stored = localStorage.getItem('abstraccount:globalEql');
      // Treat the string "null" or "undefined" as empty (handles edge cases)
      if (stored === 'null' || stored === 'undefined') {
        return '';
      }
      return stored ?? '';
    } catch { return ''; }
  })();
  private filterInitialized = false;

  // Transaction modal
  showTransactionModal = false;
  editingTransactionId: string | null = null;

  // Context menu
  contextMenuTransactionId: string | null = null;
  contextMenuPosition = { right: 0, top: 0 };

  @ViewChild('contextMenuEl') contextMenuEl?: ElementRef<HTMLElement>;

  // Context menu attachments
  contextMenuAttachments: AttachmentDTO[] = [];
  contextMenuAttachmentsLoading = false;
  contextMenuAttachmentError: string | null = null;
  contextMenuAttachmentUploading = false;

  modelService = inject(ModelService); // Public for template
  accountService = inject(AccountService); // Public for template
  route = inject(ActivatedRoute);
  controller = inject(Controller);
  cdr = inject(ChangeDetectorRef);
  private infoDialog = inject(InfoDialogService);
  private confirmDialog = inject(ConfirmDialogService);

  constructor() {
    // Watch for selected journal changes
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      const journals = this.modelService.journals$();
      
      if (journalId && journals.length > 0) {
        this.selectedJournal = journals.find(j => j.id === journalId) || null;
        if (this.selectedJournal) {
          this.loadTags();
          if (this.filterInitialized) {
            this.loadEntries();
          }
        }
      } else {
        this.selectedJournal = null;
        this.transactions = [];
        this.tags = [];
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Account tree is loaded by the auth guard, no need to load it here.
    // If FilterInputComponent had nothing in localStorage it will not emit filterChange,
    // so we must trigger the initial load ourselves.
    if (!this.filterInitialized && this.selectedJournal) {
      this.filterInitialized = true;
      this.loadEntries();
    }
  }


  async loadTags(): Promise<void> {
    if (!this.selectedJournal) return;
    
    try {
      this.tags = await this.controller.getTags(this.selectedJournal.id);
    } catch (err: any) {
      console.error('Failed to load tags:', err);
      this.tags = [];
    }
  }

  async loadEntries(): Promise<void> {
    if (!this.selectedJournal) return;
    
    this.loading = true;
    this.error = null;
    
    try {
      // Load transactions for the journal
      this.transactions = await this.controller.getTransactions(
        this.selectedJournal.id,
        undefined, // startDate (handled by filter)
        undefined, // endDate (handled by filter)
        undefined, // partnerId
        undefined, // status
        this.filterString || undefined
      );
      this.loading = false;
      this.scrollAndHighlight();
    } catch (err: any) {
      const detail = err?.error?.message ?? err.message;
      this.error = 'Failed to load transactions: ' + detail;
      this.loading = false;
    }
  }

  private scrollAndHighlight(): void {
    const txId = this.route.snapshot.queryParamMap.get('highlight');
    if (!txId) return;
    this.cdr.detectChanges();
    let attempts = 0;
    const tryScroll = () => {
      const row = document.getElementById('tx-' + txId);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const observer = new IntersectionObserver((entries, obs) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            row.classList.add('tx-flash');
            row.addEventListener('animationend', () => row.classList.remove('tx-flash'), { once: true });
          }
        }, { threshold: 0.5 });
        observer.observe(row);
      } else if (attempts++ < 20) {
        setTimeout(tryScroll, 100);
      }
    };
    setTimeout(tryScroll, 100);
  }


  onFilterChange(filter: string): void {
    this.filterString = filter;
    this.filterInitialized = true;
    setTimeout(() => this.loadEntries());
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
  
  formatDateISO(dateString: string): string {
    // Return date in ISO format (YYYY-MM-DD)
    return dateString;
  }
  
  getAccountNumberOnly(accountNumber: string): string {
    // Extract just the account number (first word)
    const parts = accountNumber.split(/[\s:]/);
    return parts[0];
  }
  
  getAccountLeafName(accountName: string): string {
    // Extract the leaf name from the full account name
    // Format: "1020 Avoirs en banque / Bank Account (asset)"
    // We want just "1020 Avoirs en banque / Bank Account (asset)"
    // The accountName from the backend is already the leaf part
    return accountName;
  }

  getPartnerDisplay(partnerId: string | null, partnerName: string | null): string {
    if (!partnerId) return '';
    if (partnerName) return `${partnerId} - ${partnerName}`;
    return partnerId;
  }

  // Transaction modal methods
  openAddTransactionModal(): void {
    if (this.isJournalLocked()) return;
    this.editingTransactionId = null;
    this.showTransactionModal = true;
  }

  openEditTransactionModal(transactionId: string): void {
    if (this.isJournalLocked()) return;
    this.editingTransactionId = transactionId;
    this.showTransactionModal = true;
    this.contextMenuTransactionId = null;
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.editingTransactionId = null;
  }

  onTransactionSaved(): void {
    this.loadEntries();
  }

  /**
   * Pure check (no side effects) of whether the currently selected journal is
   * locked. Safe to call from the template, e.g. to disable buttons.
   */
  isSelectedJournalLocked(): boolean {
    return this.selectedJournal?.locked ?? false;
  }

  /**
   * Returns true and shows an informational dialog if the currently selected
   * journal is locked. Mutating actions (add/edit/delete transaction) must
   * call this before performing their action so the user gets a clear UI
   * message instead of a raw HTTP 423 error.
   */
  private isJournalLocked(): boolean {
    if (this.selectedJournal?.locked) {
      this.infoDialog.show({
        title: 'Journal Locked',
        message: `The journal "${this.selectedJournal.title}" is locked and cannot be modified. Please unlock it on the journal management page before adding, editing or deleting transactions.`,
      });
      return true;
    }
    return false;
  }

  // Context menu methods
  openContextMenu(event: MouseEvent, transactionId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuTransactionId = transactionId;

    // Anchor the menu's right edge to the trigger button's right edge (rather
    // than the click position) so it can never overflow past the right side
    // of the viewport, no matter how wide the attachment list makes it.
    const trigger = event.currentTarget as HTMLElement;
    const triggerRect = trigger.getBoundingClientRect();
    const margin = 8;
    this.contextMenuPosition = {
      right: Math.max(margin, window.innerWidth - triggerRect.right),
      top: triggerRect.bottom
    };

    // Reposition vertically once the menu (and its eventual attachment list)
    // has rendered, so it never overflows past the bottom of the viewport either.
    setTimeout(() => this.keepContextMenuInViewport());
    this.loadContextMenuAttachments(transactionId).then(() => this.keepContextMenuInViewport());
  }

  /**
   * Nudges contextMenuPosition.top upward if needed so the rendered context
   * menu never overflows past the bottom of the browser viewport. Horizontal
   * placement is handled purely via CSS (anchored to the trigger button's
   * right edge), so no width measurement is needed here.
   */
  private keepContextMenuInViewport(): void {
    const el = this.contextMenuEl?.nativeElement;
    if (!el) return;

    const margin = 8;
    const { height } = el.getBoundingClientRect();
    if (this.contextMenuPosition.top + height > window.innerHeight - margin) {
      this.contextMenuPosition = {
        ...this.contextMenuPosition,
        top: Math.max(margin, window.innerHeight - height - margin)
      };
    }
  }

  closeContextMenu(): void {
    this.contextMenuTransactionId = null;
    this.contextMenuAttachments = [];
    this.contextMenuAttachmentError = null;
  }

  async loadContextMenuAttachments(transactionId: string): Promise<void> {
    this.contextMenuAttachmentsLoading = true;
    this.contextMenuAttachmentError = null;
    try {
      this.contextMenuAttachments = await this.controller.listAttachments(transactionId);
    } catch (err: any) {
      this.contextMenuAttachmentError = 'Failed to load attachments: ' + err.message;
    } finally {
      this.contextMenuAttachmentsLoading = false;
    }
  }

  async onContextMenuAttachmentFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !this.contextMenuTransactionId) return;
    if (this.isJournalLocked()) return;

    const transactionId = this.contextMenuTransactionId;
    this.contextMenuAttachmentError = null;
    this.contextMenuAttachmentUploading = true;
    try {
      await this.controller.uploadAttachment(transactionId, file);
      await this.loadContextMenuAttachments(transactionId);
    } catch (err: any) {
      this.contextMenuAttachmentError = 'Failed to upload attachment: ' + err.message;
    } finally {
      this.contextMenuAttachmentUploading = false;
    }
  }

  getAttachmentDownloadUrl(attachment: AttachmentDTO): string {
    return this.controller.getAttachmentDownloadUrl(attachment.id);
  }

  async deleteContextMenuAttachment(attachment: AttachmentDTO): Promise<void> {
    if (this.isJournalLocked()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete Attachment',
      message: `Are you sure you want to delete "${attachment.fileName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
    });
    if (!confirmed) return;

    const transactionId = this.contextMenuTransactionId;
    this.contextMenuAttachmentError = null;
    try {
      await this.controller.deleteAttachment(attachment.id);
      if (transactionId) {
        await this.loadContextMenuAttachments(transactionId);
      }
    } catch (err: any) {
      this.contextMenuAttachmentError = 'Failed to delete attachment: ' + err.message;
    }
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    if (!this.selectedJournal) return;
    if (this.isJournalLocked()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await this.controller.deleteTransaction(transactionId, this.selectedJournal.id);
      this.contextMenuTransactionId = null;
      await this.loadEntries();
    } catch (err: any) {
      this.error = 'Failed to delete transaction: ' + err.message;
    }
  }

  @ViewChild(FilterInputComponent) filterInput!: FilterInputComponent;

  onTagClick(tag: TagDTO): void {
    const token = tag.value ? `tag:${tag.key}:${tag.value}` : `tag:${tag.key}`;
    this.filterInput.appendText(token);
  }

  onPartnerClick(partnerId: string): void {
    this.filterInput.appendText(`partner:${partnerId}`);
  }

  sortTags(tags: TagDTO[]): TagDTO[] {
    return [...tags].sort((a, b) => {
      // First compare by key
      const keyCompare = a.key.localeCompare(b.key);
      if (keyCompare !== 0) return keyCompare;
      // If keys are equal, compare by value
      return a.value.localeCompare(b.value);
    });
  }


}
