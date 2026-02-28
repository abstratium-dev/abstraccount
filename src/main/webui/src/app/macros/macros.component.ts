import { Component, OnInit, Signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Controller, MacroDTO, MacroParameterDTO } from '../controller';
import { ModelService } from '../model.service';

@Component({
  selector: 'macros',
  imports: [CommonModule, FormsModule],
  templateUrl: './macros.component.html',
  styleUrl: './macros.component.scss'
})
export class MacrosComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);

  macros: Signal<MacroDTO[]> = this.modelService.macros$;
  selectedJournalId: Signal<string | null> = this.modelService.selectedJournalId$;
  
  selectedMacro: MacroDTO | null = null;
  parameterValues: Map<string, string> = new Map();
  generatedTransaction: string = '';
  showExecuteDialog: boolean = false;
  errorMessage: string = '';

  constructor() {
    // Load macros when journal changes
    effect(() => {
      const journalId = this.selectedJournalId();
      if (journalId) {
        this.loadMacros(journalId);
      }
    });
  }

  ngOnInit(): void {
    const journalId = this.selectedJournalId();
    if (journalId) {
      this.loadMacros(journalId);
    }
  }

  async loadMacros(journalId: string): Promise<void> {
    try {
      await this.controller.listMacros(journalId);
    } catch (error) {
      console.error('Error loading macros:', error);
      this.errorMessage = 'Failed to load macros. Please try again.';
    }
  }

  selectMacro(macro: MacroDTO): void {
    this.selectedMacro = macro;
    this.showExecuteDialog = true;
    this.errorMessage = '';
    this.generatedTransaction = '';
    
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
    this.generatedTransaction = '';
    this.errorMessage = '';
  }

  getParameterValue(paramName: string): string {
    return this.parameterValues.get(paramName) || '';
  }

  setParameterValue(paramName: string, value: string): void {
    this.parameterValues.set(paramName, value);
  }

  generateTransaction(): void {
    if (!this.selectedMacro) return;

    this.errorMessage = '';
    
    // Validate required parameters
    for (const param of this.selectedMacro.parameters) {
      if (param.required && !this.parameterValues.get(param.name)) {
        this.errorMessage = `Parameter "${param.prompt || param.name}" is required.`;
        return;
      }
    }

    // Replace placeholders in template
    let transaction = this.selectedMacro.template;
    for (const [key, value] of this.parameterValues.entries()) {
      const placeholder = `{${key}}`;
      transaction = transaction.split(placeholder).join(value);
    }

    this.generatedTransaction = transaction;
  }

  copyToClipboard(): void {
    if (!this.generatedTransaction) return;
    
    navigator.clipboard.writeText(this.generatedTransaction).then(() => {
      alert('Transaction copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.errorMessage = 'Failed to copy to clipboard.';
    });
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
}
