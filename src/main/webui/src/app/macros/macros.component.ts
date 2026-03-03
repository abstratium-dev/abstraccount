import { Component, OnInit, Signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Controller, MacroDTO, MacroParameterDTO } from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';

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

  macros: Signal<MacroDTO[]> = this.modelService.macros$;
  
  selectedMacro: MacroDTO | null = null;
  parameterValues: Map<string, string> = new Map();
  showExecuteDialog: boolean = false;
  errorMessage: string = '';

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
    this.selectedMacro = macro;
    this.showExecuteDialog = true;
    this.errorMessage = '';
    
    // Initialize parameter values with defaults
    this.parameterValues.clear();
    for (const param of macro.parameters) {
      if (param.defaultValue) {
        this.parameterValues.set(param.name, param.defaultValue);
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

  getParameterValue(paramName: string): string {
    return this.parameterValues.get(paramName) || '';
  }

  setParameterValue(paramName: string, value: string): void {
    this.parameterValues.set(paramName, value);
  }

  async generateTransaction(): Promise<void> {
    if (!this.selectedMacro) return;

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
}
