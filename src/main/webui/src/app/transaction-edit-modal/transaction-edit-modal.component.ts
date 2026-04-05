import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Controller, CreateEntryRequest, CreateTransactionRequest, TransactionDTO, UpdateEntryRequest, UpdateTransactionRequest, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';

@Component({
  selector: 'app-transaction-edit-modal',
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './transaction-edit-modal.component.html',
  styleUrls: ['./transaction-edit-modal.component.scss']
})
export class TransactionEditModalComponent implements OnInit {
  @Input() transactionId: string | null = null;
  @Input() journalId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  controller = inject(Controller);
  modelService = inject(ModelService);

  isNew = true;
  loading = false;
  error: string | null = null;

  // Form fields
  date: string = '';
  status: string = 'CLEARED';
  description: string = '';
  partnerId: string = '';
  tagInput: string = '';
  tags: TagDTO[] = [];
  entries: EntryFormEntry[] = [];

  availableStatuses = ['CLEARED', 'PENDING', 'RECONCILED'];

  ngOnInit(): void {
    this.isNew = !this.transactionId;
    
    if (this.transactionId) {
      this.loadTransaction();
    } else {
      // Initialize with default values for new transaction
      this.date = new Date().toISOString().split('T')[0];
      this.addEntry();
      this.addEntry();
    }
  }

  async loadTransaction(): Promise<void> {
    if (!this.transactionId) return;
    
    this.loading = true;
    this.error = null;
    
    try {
      const transaction = await this.controller.getTransaction(this.transactionId);
      
      this.date = transaction.date;
      this.status = transaction.status;
      this.description = transaction.description;
      this.partnerId = transaction.partnerId || '';
      this.tags = [...transaction.tags];
      this.entries = transaction.entries.map(e => ({
        id: e.id,
        entryOrder: e.entryOrder,
        accountId: e.accountId,
        accountName: e.accountName,
        commodity: e.commodity,
        amount: e.amount,
        note: e.note || ''
      }));
      
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load transaction: ' + err.message;
      this.loading = false;
    }
  }

  addEntry(): void {
    const order = this.entries.length;
    this.entries.push({
      id: null,
      entryOrder: order,
      accountId: '',
      accountName: '',
      commodity: this.modelService.journals$().find(j => j.id === this.journalId)?.currency || 'CHF',
      amount: 0,
      note: ''
    });
  }

  removeEntry(index: number): void {
    this.entries.splice(index, 1);
    // Reorder remaining entries
    this.entries.forEach((entry, idx) => {
      entry.entryOrder = idx;
    });
  }

  addTag(): void {
    if (!this.tagInput.trim()) return;
    
    const parts = this.tagInput.split(':');
    const key = parts[0].trim();
    const value = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
    
    if (key) {
      this.tags.push({ key, value });
      this.tagInput = '';
    }
  }

  removeTag(index: number): void {
    this.tags.splice(index, 1);
  }

  async save(): Promise<void> {
    this.error = null;
    
    // Validation
    if (!this.date) {
      this.error = 'Date is required';
      return;
    }
    if (!this.description.trim()) {
      this.error = 'Description is required';
      return;
    }
    if (this.entries.length === 0) {
      this.error = 'At least one entry is required';
      return;
    }
    
    // Check that all entries have account IDs
    for (const entry of this.entries) {
      if (!entry.accountId) {
        this.error = 'All entries must have an account selected';
        return;
      }
    }
    
    // CRITICAL: Validate that entries sum to zero
    if (!this.isBalanced()) {
      this.error = 'Transaction entries must sum to zero. Current balance: ' + this.getBalance().toFixed(2);
      return;
    }
    
    this.loading = true;
    
    try {
      if (this.isNew) {
        const request: CreateTransactionRequest = {
          journalId: this.journalId,
          date: this.date,
          status: this.status,
          description: this.description,
          partnerId: this.partnerId || null,
          tags: this.tags,
          entries: this.entries.map(e => ({
            entryOrder: e.entryOrder,
            accountId: e.accountId,
            commodity: e.commodity,
            amount: e.amount,
            note: e.note || null
          }))
        };
        
        await this.controller.createTransaction(request);
      } else {
        const request: UpdateTransactionRequest = {
          date: this.date,
          status: this.status,
          description: this.description,
          partnerId: this.partnerId || null,
          tags: this.tags,
          entries: this.entries.map(e => ({
            id: e.id,
            entryOrder: e.entryOrder,
            accountId: e.accountId,
            commodity: e.commodity,
            amount: e.amount,
            note: e.note || null
          }))
        };
        
        await this.controller.updateTransaction(this.transactionId!, this.journalId, request);
      }
      
      this.loading = false;
      this.saved.emit();
      this.close.emit();
    } catch (err: any) {
      this.error = 'Failed to save transaction: ' + err.message;
      this.loading = false;
    }
  }

  cancel(): void {
    this.close.emit();
  }

  getBalance(): number {
    return this.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  }

  isBalanced(): boolean {
    const balance = this.getBalance();
    return Math.abs(balance) < 0.01;
  }

  /**
   * Fetch partner options for autocomplete.
   */
  fetchPartnerOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    try {
      const partners = await this.controller.searchPartners(searchTerm);
      return partners.map(p => ({
        value: p.partnerNumber,
        label: `${p.partnerNumber} - ${p.name}`
      }));
    } catch (error) {
      console.error('Error fetching partner options:', error);
      return [];
    }
  };

  /**
   * Handle partner selection from autocomplete.
   */
  onPartnerSelected(option: AutocompleteOption | null): void {
    this.partnerId = option ? option.value : '';
  }

  /**
   * Fetch tag options for autocomplete based on search term.
   * Returns journal-specific tags first, then global tag keys.
   */
  fetchTagOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    try {
      // Build a simple pattern match
      const lowerSearch = searchTerm.toLowerCase();
      
      // Get journal-specific tags (key:value pairs)
      const journalTags = await this.controller.getTags(this.journalId);
      
      // Filter journal tags that match the search term
      const matchingJournalTags = journalTags.filter(tag => {
        const tagString = tag.value ? `${tag.key}:${tag.value}` : tag.key;
        return tagString.toLowerCase().includes(lowerSearch);
      });
      
      // Convert to autocomplete options
      const journalOptions = matchingJournalTags.map(tag => {
        const tagString = tag.value ? `${tag.key}:${tag.value}` : tag.key;
        return {
          value: tagString,
          label: tagString
        };
      });
      
      // Get all global tag keys
      const globalTagKeys = await this.controller.getAllTagKeys();
      
      // Filter global tag keys that match and aren't already in journal tags
      const journalTagKeys = new Set(journalTags.map(t => t.key));
      const matchingGlobalKeys = globalTagKeys.filter(key => 
        key.toLowerCase().includes(lowerSearch) && !journalTagKeys.has(key)
      );
      
      // Convert global keys to autocomplete options
      const globalOptions = matchingGlobalKeys.map(key => ({
        value: key,
        label: key
      }));
      
      // Combine: journal-specific tags first, then global tag keys
      const allOptions = [...journalOptions, ...globalOptions];
      
      // Limit to first 50 results
      return allOptions.slice(0, 50);
    } catch (error) {
      console.error('Error fetching tag options:', error);
      return [];
    }
  };

  /**
   * Handle tag selection from autocomplete.
   */
  onTagSelected(option: AutocompleteOption | null): void {
    if (option) {
      this.tagInput = option.value;
      // Automatically add the tag when selected
      this.addTag();
    }
  }

  /**
   * Fetch account options for autocomplete based on search term.
   * Flattens the account tree and filters using regex pattern matching.
   * Prioritizes matches on account number.
   */
  fetchAccountOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    try {
      const accounts = this.modelService.getAccounts();
      
      // Flatten the account tree
      const flatAccounts: Array<{ id: string; name: string; number: string; fullPath: string }> = [];
      
      const flatten = (account: any, path: string[] = []) => {
        const currentPath = [...path, account.name];
        const fullPath = currentPath.join(' > ');
        
        // Extract account number (part before first space in account name)
        const accountNumber = account.name.indexOf(' ') > 0 
          ? account.name.substring(0, account.name.indexOf(' '))
          : account.name;
        
        flatAccounts.push({
          id: account.id,
          name: account.name,
          number: accountNumber,
          fullPath: fullPath
        });
        
        if (account.children && account.children.length > 0) {
          account.children.forEach((child: any) => flatten(child, currentPath));
        }
      };
      
      accounts.forEach(account => flatten(account));
      
      // Filter accounts
      let matchingAccounts = flatAccounts;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        
        // Check if search term looks like a number (account number search)
        const isNumericSearch = /^[\d.]+$/.test(searchTerm);
        
        if (isNumericSearch) {
          // For numeric searches, prioritize exact account number matches
          matchingAccounts = flatAccounts.filter(account => 
            account.number.toLowerCase().startsWith(lowerSearch)
          );
        } else {
          // For text searches, search in full path
          // Check if the search term contains regex metacharacters
          const hasRegexChars = /[.*+?{}()|[\]\\]/.test(searchTerm);
          
          if (!hasRegexChars && !searchTerm.startsWith('^') && !searchTerm.endsWith('$')) {
            // Simple text search
            matchingAccounts = flatAccounts.filter(account => 
              account.fullPath.toLowerCase().includes(lowerSearch)
            );
          } else {
            // Regex pattern search
            try {
              const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = '.*' + escapedTerm + '.*';
              const regex = new RegExp(pattern, 'i');
              matchingAccounts = flatAccounts.filter(account => 
                regex.test(account.fullPath)
              );
            } catch (e) {
              // Invalid regex, fall back to simple substring match
              matchingAccounts = flatAccounts.filter(account => 
                account.fullPath.toLowerCase().includes(lowerSearch)
              );
            }
          }
        }
      }
      
      // Limit to first 50 results
      return matchingAccounts.slice(0, 50).map(account => ({
        value: account.id,
        label: account.fullPath
      }));
    } catch (error) {
      console.error('Error fetching account options:', error);
      return [];
    }
  };

  /**
   * Handle account selection from autocomplete for a specific entry.
   */
  onAccountSelected(entryIndex: number, option: AutocompleteOption | null): void {
    if (option && this.entries[entryIndex]) {
      this.entries[entryIndex].accountId = option.value;
      
      // Update account name for display
      const account = this.modelService.findAccount(option.value);
      if (account) {
        this.entries[entryIndex].accountName = account.name;
      }
    }
  }
}

interface EntryFormEntry {
  id: string | null;
  entryOrder: number;
  accountId: string;
  accountName: string;
  commodity: string;
  amount: number;
  note: string;
}
