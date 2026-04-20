import { Component, Input, Output, EventEmitter, forwardRef, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export interface AutocompleteOption {
  value: string;
  label: string;
}

@Component({
  selector: 'abs-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteComponent),
      multi: true
    }
  ]
})
export class AutocompleteComponent implements ControlValueAccessor {
  @Input() placeholder = 'Search...';
  @Input() minSearchLength = 3;
  @Input() debounceMs = 300;
  @Input() noResultsText = 'No results found';
  @Input() searchingText = 'Searching...';
  @Input() required = false;
  @Input() allowFreeText = false; // If true, ngModel updates on every keystroke
  
  // Function to fetch options based on search term
  @Input() fetchOptions!: (searchTerm: string) => Promise<AutocompleteOption[]>;
  
  // Optional function to resolve a single value to its label (for initial display)
  // If provided, this is used instead of fetchOptions when resolving an existing value
  @Input() resolveLabel?: (value: string) => Promise<string | null>;
  
  @Output() optionSelected = new EventEmitter<AutocompleteOption | null>();
  @Output() freeTextEntered = new EventEmitter<string>(); // Emitted when user presses Enter with free text

  searchTerm = signal('');
  selectedValue = signal<string | null>(null);
  selectedLabel = signal<string | null>(null);
  options = signal<AutocompleteOption[]>([]);
  isLoading = signal(false);
  showDropdown = signal(false);
  highlightedIndex = signal(-1);

  private searchTimeout: any;
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Auto-search when search term changes
    effect(() => {
      const term = this.searchTerm();
      this.performSearch(term);
    });
  }

  async writeValue(value: string | null): Promise<void> {
    this.selectedValue.set(value);
    
    // If we have a value, resolve it to a label
    if (value) {
      // First check current options
      let option = this.options().find(opt => opt.value === value);
      
      if (option) {
        this.selectedLabel.set(option.label);
        this.searchTerm.set(option.label);
        return;
      }
      
      // If resolveLabel function is provided, use it (more efficient than fetching all)
      if (this.resolveLabel) {
        try {
          const label = await this.resolveLabel(value);
          if (label) {
            this.selectedLabel.set(label);
            this.searchTerm.set(label);
            return;
          }
        } catch (error) {
          console.error('Error resolving label for value:', error);
        }
      }
      
      // Fall back to fetching all options
      if (this.fetchOptions) {
        try {
          const allOptions = await this.fetchOptions('');
          option = allOptions.find(opt => opt.value === value);
          if (option) {
            this.selectedLabel.set(option.label);
            this.searchTerm.set(option.label);
            return;
          }
        } catch (error) {
          console.error('Error fetching options for value:', error);
        }
      }
      
      // Value could not be resolved - display it as-is (e.g., for placeholders like {next_invoice_SI})
      this.selectedLabel.set(value);
      this.searchTerm.set(value);
    } else {
      this.selectedLabel.set(null);
      this.searchTerm.set('');
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInputChange(value: string): void {
    this.searchTerm.set(value);
    this.showDropdown.set(true);
    this.highlightedIndex.set(-1);
    
    // If allowFreeText is true, update ngModel with typed text
    if (this.allowFreeText) {
      this.selectedValue.set(value);
      this.onChange(value);
    }
  }

  onInputFocus(): void {
    const term = this.searchTerm();
    if (term.length === 0 || term.length >= this.minSearchLength) {
      this.showDropdown.set(true);
    }
  }

  onInputBlur(): void {
    this.onTouched();
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  selectOption(option: AutocompleteOption): void {
    this.selectedValue.set(option.value);
    this.selectedLabel.set(option.label);
    this.searchTerm.set(option.label);
    this.showDropdown.set(false);
    this.onChange(option.value);
    this.optionSelected.emit(option);
  }

  clearSelection(): void {
    this.selectedValue.set(null);
    this.selectedLabel.set(null);
    this.searchTerm.set('');
    this.options.set([]);
    this.showDropdown.set(false);
    this.onChange(null);
    this.optionSelected.emit(null);
  }

  onKeyDown(event: KeyboardEvent): void {
    const currentOptions = this.options();
    const currentIndex = this.highlightedIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < currentOptions.length - 1) {
          this.highlightedIndex.set(currentIndex + 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          this.highlightedIndex.set(currentIndex - 1);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < currentOptions.length) {
          this.selectOption(currentOptions[currentIndex]);
        } else if (this.allowFreeText) {
          // Accept current text as free text entry
          const currentTerm = this.searchTerm().trim();
          if (currentTerm) {
            this.freeTextEntered.emit(currentTerm);
            // Clear the input for next entry
            this.searchTerm.set('');
            this.selectedValue.set(null);
            this.selectedLabel.set(null);
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showDropdown.set(false);
        break;
    }
  }

  performSearch(term: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    const trimmedTerm = term.trim();

    // Clear options if search term is too short
    if (trimmedTerm.length > 0 && trimmedTerm.length < this.minSearchLength) {
      this.options.set([]);
      this.isLoading.set(false);
      return;
    }

    // Allow empty search to show all results
    if (trimmedTerm.length === 0 || trimmedTerm.length >= this.minSearchLength) {
      this.searchTimeout = setTimeout(async () => {
        this.isLoading.set(true);
        this.options.set([]); // Clear old results immediately
        try {
          const results = await this.fetchOptions(trimmedTerm);
          this.options.set(results);
        } catch (error) {
          console.error('Error fetching autocomplete options:', error);
          this.options.set([]);
        } finally {
          this.isLoading.set(false);
        }
      }, this.debounceMs);
    }
  }
}
