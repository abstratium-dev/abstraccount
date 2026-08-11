import { Component, OnInit, Signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, MacroDTO, MacroParameterDTO, ImportResult, ImportConflict, MacroBatchExecuteResult } from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { InfoDialogService } from '../core/info-dialog/info-dialog.service';
import { ToastService } from '../core/toast/toast.service';

@Component({
  selector: 'macros',
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './macros.component.html',
  styleUrl: './macros.component.scss'
})
export class MacrosComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  private infoDialog = inject(InfoDialogService);
  private toast = inject(ToastService);

  macros: Signal<MacroDTO[]> = this.modelService.macros$;
  
  selectedMacro: MacroDTO | null = null;
  parameterValues: Map<string, string> = new Map();
  showExecuteDialog: boolean = false;
  errorMessage: string = '';

  showImportDialog: boolean = false;
  importResult: ImportResult | null = null;
  importFileName: string = '';
  importFileContent: string = '';
  importInProgress: boolean = false;

  menuOpen: boolean = false;

  // Batch execution
  selectedBatchMacro: MacroDTO | null = null;
  showBatchDialog: boolean = false;
  batchSharedValues: Map<string, string> = new Map();
  batchCsv: string = '';
  batchResult: MacroBatchExecuteResult | null = null;
  batchInProgress: boolean = false;
  batchErrorMessage: string = '';

  constructor() {
  }

  ngOnInit(): void {
    this.loadMacros();
  }

  async loadMacros(): Promise<void> {
    try {
      await this.controller.listMacros();
    } catch (error) {
      console.error('Error loading macros:', error);
      this.errorMessage = 'Failed to load macros. Please try again.';
    }
  }

  selectMacro(macro: MacroDTO): void {
    if (this.isJournalLocked()) return;
    this.selectedMacro = macro;
    this.showExecuteDialog = true;
    this.errorMessage = '';
    
    // Initialize parameter values with defaults, resolving built-in date variables
    this.parameterValues.clear();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    for (const param of macro.parameters) {
      if (param.defaultValue) {
        const resolved = param.defaultValue
          .replace(/\{today\}/g, today)
          .replace(/\{year\}/g, year)
          .replace(/\{month\}/g, month)
          .replace(/\{day\}/g, day);
        this.parameterValues.set(param.name, resolved);
      } else {
        this.parameterValues.set(param.name, '');
      }
    }
  }

  closeDialog(): void {
    this.showExecuteDialog = false;
    this.selectedMacro = null;
    this.parameterValues.clear();
    this.errorMessage = '';
  }

  /**
   * Returns true and shows an informational dialog if the currently selected
   * journal is locked. Macro execution is a mutating operation (it creates
   * transactions), so it must be blocked against a locked journal. The guard
   * is applied both when opening the execute dialog and when submitting it,
   * so the user gets a clear UI message instead of a raw HTTP 423 error.
   */
  private isJournalLocked(): boolean {
    const journalId = this.modelService.selectedJournalId$();
    const journal = this.modelService.journals$().find(j => j.id === journalId) ?? null;
    if (journal?.locked) {
      this.infoDialog.show({
        title: 'Journal Locked',
        message: `The journal "${journal.title}" is locked and cannot be modified. Please unlock it on the journal management page before executing macros.`,
      });
      return true;
    }
    return false;
  }

  async deleteMacro(macro: MacroDTO, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete Macro',
      message: `Are you sure you want to delete the macro "${macro.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
    });
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    try {
      await this.controller.deleteMacro(macro.id);
      this.toast.success(`Macro "${macro.name}" deleted.`);
    } catch (error) {
      console.error('Error deleting macro:', error);
      this.errorMessage = `Failed to delete macro "${macro.name}".`;
      this.toast.error(`Failed to delete macro "${macro.name}".`);
    }
  }

  getParameterValue(paramName: string): string {
    return this.parameterValues.get(paramName) || '';
  }

  setParameterValue(paramName: string, value: string): void {
    this.parameterValues.set(paramName, value);
  }

  async generateTransaction(): Promise<void> {
    if (!this.selectedMacro) return;
    if (this.isJournalLocked()) return;

    this.errorMessage = '';
    
    // Validate required parameters
    for (const param of this.selectedMacro.parameters) {
      if (param.required && !this.parameterValues.get(param.name)) {
        this.errorMessage = `Parameter "${param.prompt || param.name}" is required.`;
        return;
      }
    }

    const journalId = this.modelService.selectedJournalId$();
    if (!journalId) {
      this.errorMessage = 'No journal selected';
      return;
    }

    try {
      // Convert Map to plain object
      const parameters: Record<string, string> = {};
      this.parameterValues.forEach((value, key) => {
        parameters[key] = value;
      });

      // Execute macro on backend
      const transactionId = await this.controller.executeMacro(
        this.selectedMacro.id,
        journalId,
        parameters
      );

      // Close dialog
      this.closeDialog();

      // Navigate to journal view
      await this.router.navigate(['/journal']);
    } catch (error) {
      console.error('Error executing macro:', error);
      this.errorMessage = 'Failed to execute macro. Please try again.';
    }
  }


  // ===== Batch execution =====

  /**
   * The macro's account-type parameters are filled in once for the whole batch
   * (e.g. revenue account, fee expense account, processor account).
   */
  getBatchSharedParameters(macro: MacroDTO): MacroParameterDTO[] {
    return macro.parameters.filter(param => param.type === 'account');
  }

  /**
   * The macro's remaining parameters come from the CSV, in this order, one row per transaction.
   */
  getBatchRowParameterNames(macro: MacroDTO): string[] {
    return macro.parameters.filter(param => param.type !== 'account').map(param => param.name);
  }

  selectMacroForBatch(macro: MacroDTO, event: Event): void {
    event.stopPropagation();
    if (this.isJournalLocked()) return;
    this.selectedBatchMacro = macro;
    this.showBatchDialog = true;
    this.batchErrorMessage = '';
    this.batchResult = null;
    this.batchCsv = '';
    this.batchSharedValues.clear();
    for (const param of this.getBatchSharedParameters(macro)) {
      this.batchSharedValues.set(param.name, '');
    }
  }

  closeBatchDialog(): void {
    this.showBatchDialog = false;
    this.selectedBatchMacro = null;
    this.batchSharedValues.clear();
    this.batchCsv = '';
    this.batchResult = null;
    this.batchErrorMessage = '';
  }

  getBatchSharedValue(paramName: string): string {
    return this.batchSharedValues.get(paramName) || '';
  }

  setBatchSharedValue(paramName: string, value: string): void {
    this.batchSharedValues.set(paramName, value);
  }

  async executeBatch(): Promise<void> {
    if (!this.selectedBatchMacro) return;
    if (this.isJournalLocked()) return;

    this.batchErrorMessage = '';

    for (const param of this.getBatchSharedParameters(this.selectedBatchMacro)) {
      if (param.required && !this.batchSharedValues.get(param.name)) {
        this.batchErrorMessage = `Parameter "${param.prompt || param.name}" is required.`;
        return;
      }
    }

    if (!this.batchCsv.trim()) {
      this.batchErrorMessage = 'Please paste CSV data with one row per transaction.';
      return;
    }

    const journalId = this.modelService.selectedJournalId$();
    if (!journalId) {
      this.batchErrorMessage = 'No journal selected';
      return;
    }

    const sharedParameters: Record<string, string> = {};
    this.batchSharedValues.forEach((value, key) => {
      sharedParameters[key] = value;
    });

    this.batchInProgress = true;
    try {
      this.batchResult = await this.controller.executeMacroBatch(
        this.selectedBatchMacro.id,
        journalId,
        sharedParameters,
        this.batchCsv
      );
      if (this.batchResult.failureCount === 0) {
        this.toast.success(`Successfully created ${this.batchResult.successCount} transaction(s).`);
      } else {
        this.toast.error(
          `Created ${this.batchResult.successCount} transaction(s), ${this.batchResult.failureCount} row(s) failed.`
        );
      }
    } catch (error) {
      console.error('Error executing macro batch:', error);
      this.batchErrorMessage = 'Failed to execute macro batch. Please try again.';
    } finally {
      this.batchInProgress = false;
    }
  }

  getParameterInputType(param: MacroParameterDTO): string {
    switch (param.type) {
      case 'date':
        return 'date';
      case 'amount':
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }

  // Autocomplete fetch function for accounts
  // Returns a function that takes searchTerm and filter regex
  fetchAccountsWithFilter(filterRegex?: string): (searchTerm: string) => Promise<AutocompleteOption[]> {
    return async (searchTerm: string): Promise<AutocompleteOption[]> => {
      try {
        const accounts = this.modelService.getAccounts();
        
        // Flatten the account tree
        const flatAccounts: AutocompleteOption[] = [];
        const flattenAccounts = (accts: any[], codePath: string[] = [], namePath: string[] = []) => {
          for (const acct of accts) {
            let code = acct.name.indexOf(' ') > -1 ? acct.name.substring(0, acct.name.indexOf(' ')) : acct.name;
            const currentCodePath = [...codePath, code];
            const currentNamePath = [...namePath, acct.name];
            const fullCode = currentCodePath.join(':');
            
            // Build display label: code path + last account full name
            // e.g., "1:10:100:1020 Avoirs en banque / Bank Account (asset)"
            const parentCodes = currentCodePath.slice(0, -1).join(':');
            const displayCode = parentCodes ? `${parentCodes}:${code}` : code;

            // nameWithoutCode is simply the name, with the code removed. it is not the actual name, rather if there is no space, it is empty.
            const nameWithoutCode = acct.name.indexOf(' ') > -1 ? acct.name.substring(acct.name.indexOf(' ')) : '';

            const label = `${displayCode} ${nameWithoutCode}`;
            
            // Apply filter regex if provided
            let matches = true;
            if (filterRegex) {
              try {
                const regex = new RegExp(filterRegex);
                matches = regex.test(fullCode);
              } catch (e) {
                console.warn('Invalid filter regex:', filterRegex, e);
                this.errorMessage = 'Invalid filter regex: ' + filterRegex;
              }
            }
            
            // Filter by search term and regex filter
            if (matches && (!searchTerm || label.toLowerCase().includes(searchTerm.toLowerCase()))) {
              flatAccounts.push({
                value: fullCode,
                label: label
              });
            }
            
            if (acct.children && acct.children.length > 0) {
              flattenAccounts(acct.children, currentCodePath, currentNamePath);
            }
          }
        };
        
        flattenAccounts(accounts);
        return flatAccounts;
      } catch (error) {
        console.error('Error fetching accounts:', error);
        return [];
      }
    };
  }

  // Check if parameter should use autocomplete
  usesAutocomplete(param: MacroParameterDTO): boolean {
    return param.type === 'account' || param.type === 'partner' || param.type === 'invoice';
  }

  // Get autocomplete fetch function for parameter
  getAutocompleteFetch(param: MacroParameterDTO): ((searchTerm: string) => Promise<AutocompleteOption[]>) | null {
    if (param.type === 'account') {
      return this.fetchAccountsWithFilter(param.filter || undefined);
    }
    if (param.type === 'partner') {
      return this.fetchPartners.bind(this);
    }
    if (param.type === 'invoice') {
      return this.fetchInvoices.bind(this);
    }
    return null;
  }

  // Autocomplete fetch function for partners
  async fetchPartners(searchTerm: string): Promise<AutocompleteOption[]> {
    try {
      const partners = await this.controller.searchPartners(searchTerm);
      return partners.map(p => ({
        value: p.partnerNumber,
        label: `${p.partnerNumber} ${p.name}`
      }));
    } catch (error) {
      console.error('Error fetching partners:', error);
      return [];
    }
  }

  // Autocomplete fetch function for invoices
  async fetchInvoices(searchTerm: string): Promise<AutocompleteOption[]> {
    try {
      const journalId = this.modelService.getSelectedJournalId();
      if (!journalId) {
        return [];
      }
      
      const invoices = await this.controller.searchInvoices(journalId, searchTerm || undefined);
      return invoices.map(inv => ({
        value: inv,
        label: inv
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  // ===== Import / Export =====

  async importBuiltinMacros(): Promise<void> {
    this.openImportDialog();
    this.errorMessage = '';
    this.importInProgress = true;
    try {
      const response = await fetch('/builtin/macros-export.yaml');
      if (!response.ok) {
        throw new Error(`Failed to load built-in macros: ${response.status}`);
      }
      this.importFileContent = await response.text();
      this.importFileName = 'macros-export.yaml (built-in)';
    } catch (error) {
      console.error('Error loading built-in macros:', error);
      this.errorMessage = 'Failed to load built-in macros.';
      this.importInProgress = false;
      return;
    }
    await this.performImport();
  }

  async exportMacros(): Promise<void> {
    try {
      const yaml = await this.controller.exportMacros();
      this.downloadFile(yaml, 'macros-export.yaml');
    } catch (error) {
      console.error('Error exporting macros:', error);
      this.errorMessage = 'Failed to export macros.';
    }
  }

  openImportDialog(): void {
    this.showImportDialog = true;
    this.importResult = null;
    this.importFileName = '';
    this.importFileContent = '';
    this.errorMessage = '';
  }

  closeImportDialog(): void {
    this.showImportDialog = false;
    this.importResult = null;
    this.importFileName = '';
    this.importFileContent = '';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.importFileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.importFileContent = reader.result as string;
      };
      reader.readAsText(file);
    }
  }

  async performImport(): Promise<void> {
    if (!this.importFileContent) {
      this.errorMessage = 'Please select a file first.';
      return;
    }

    this.importInProgress = true;
    this.errorMessage = '';

    try {
      const result = await this.controller.importMacros(this.importFileContent);

      if (result.status === 'conflict' && result.conflicts) {
        this.importResult = result;
      } else if (result.status === 'error') {
        this.errorMessage = result.message || 'Import failed due to invalid data.';
      } else {
        const count = result.imported ?? 0;
        let message = `Successfully imported ${count} macro(s).`;
        if (result.items) {
          const renamed = result.items.filter(i => i.originalName !== i.finalName);
          if (renamed.length > 0) {
            message += ` Renamed: ${renamed.map(i => i.finalName).join(', ')}.`;
          }
        }
        this.toast.success(message);
        this.closeImportDialog();
      }
    } catch (error) {
      console.error('Error importing macros:', error);
      this.errorMessage = 'Failed to import macros. Please check the file format.';
    } finally {
      this.importInProgress = false;
    }
  }

  async resolveConflictsReplace(): Promise<void> {
    if (!this.importResult?.conflicts) return;

    this.importInProgress = true;
    this.errorMessage = '';

    try {
      const replaceIds = this.importResult.conflicts.map(c => c.existingId);
      const result = await this.controller.importMacros(this.importFileContent, replaceIds);

      if (result.status === 'conflict' && result.conflicts) {
        this.importResult = result;
      } else if (result.status === 'error') {
        this.errorMessage = result.message || 'Import failed.';
        this.importResult = null;
      } else {
        const count = result.imported ?? 0;
        this.toast.success(`Successfully imported ${count} macro(s).`);
        this.closeImportDialog();
      }
    } catch (error) {
      console.error('Error replacing macros:', error);
      this.errorMessage = 'Failed to replace macros.';
    } finally {
      this.importInProgress = false;
    }
  }

  async resolveConflictsRename(): Promise<void> {
    if (!this.importFileContent) return;

    this.importInProgress = true;
    this.errorMessage = '';

    try {
      const result = await this.controller.importMacros(this.importFileContent, [], true);

      if (result.status === 'error') {
        this.errorMessage = result.message || 'Import failed.';
        this.importResult = null;
      } else {
        const count = result.imported ?? 0;
        let message = `Successfully imported ${count} macro(s).`;
        if (result.items) {
          const renamed = result.items.filter(i => i.originalName !== i.finalName);
          if (renamed.length > 0) {
            message += ` Renamed: ${renamed.map(i => i.finalName).join(', ')}.`;
          }
        }
        this.toast.success(message);
        this.closeImportDialog();
      }
    } catch (error) {
      console.error('Error importing with rename:', error);
      this.errorMessage = 'Failed to import macros.';
    } finally {
      this.importInProgress = false;
    }
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
