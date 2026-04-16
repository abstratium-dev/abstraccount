import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagDTO } from '../../controller';

interface AutocompleteSuggestion {
  text: string;
  description?: string;
}

@Component({
  selector: 'filter-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-input.component.html',
  styleUrl: './filter-input.component.scss'
})
export class FilterInputComponent implements OnInit, OnDestroy {
  @ViewChild('filterInput') filterInputRef!: ElementRef<HTMLInputElement>;

  @Input() placeholder = 'Filter (e.g., date:gte:2024-01-01 AND description:*invoice* AND NOT accounttype:EQUITY)';
  @Input() tags: TagDTO[] = [];
  @Input() storageKey = 'abstraccount:globalEql';
  @Output() filterChange = new EventEmitter<string>();

  filterText = signal('');
  suggestions = signal<AutocompleteSuggestion[]>([]);
  showSuggestions = signal(false);
  selectedIndex = signal(-1);
  cursorPosition = 0;

  private hasLoadedFromStorage = false;
  private isProgrammaticUpdate = false;

  @Input()
  set value(val: string) {
    // Only update if it's a real change and not from storage initialization
    if (val !== this.filterText() && !this.isProgrammaticUpdate) {
      this.filterText.set(val ?? '');
      // When parent sets value programmatically (e.g., loading saved config),
      // save to storage and emit
      if (this.hasLoadedFromStorage) {
        this.saveToStorage();
        this.filterChange.emit(val ?? '');
      }
    }
  }
  get value(): string {
    return this.filterText();
  }

  constructor() {
    effect(() => {
      const text = this.filterText();
      this.updateSuggestions(text);
    });
  }

  ngOnInit(): void {
    // Load from localStorage if available, otherwise use input value
    const stored = this.loadFromStorage();
    this.isProgrammaticUpdate = true;  // Prevent setter from re-emitting
    if (stored !== null) {
      this.filterText.set(stored);
      this.hasLoadedFromStorage = true;
      // Emit the loaded value so parent components get the stored filter immediately
      this.filterChange.emit(stored);
    } else {
      this.filterText.set(this.filterText() || '');
      this.hasLoadedFromStorage = true;
    }
    this.isProgrammaticUpdate = false;
    this.updateSuggestions(this.filterText());
  }

  ngOnDestroy(): void {
  }

  onInputChange(value: string): void {
    this.filterText.set(value);
  }

  private getInputElement(): HTMLInputElement | null {
    return this.filterInputRef?.nativeElement ?? null;
  }

  onKeyDown(event: KeyboardEvent, input: HTMLInputElement): void {
    const currentSuggestions = this.suggestions();
    const currentIndex = this.selectedIndex();
    const suggestionsVisible = this.showSuggestions();
    const inputEl = this.getInputElement();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!suggestionsVisible || currentSuggestions.length === 0) {
        // Suggestions not showing - move cursor to end
        this.showSuggestions.set(false);
        this.selectedIndex.set(-1);
        if (inputEl) {
          requestAnimationFrame(() => {
            inputEl.focus();
            const endPos = this.filterText().length;
            inputEl.setSelectionRange(endPos, endPos);
            this.cursorPosition = endPos;
          });
        }
      } else if (currentIndex === -1) {
        // No selection - select first suggestion
        this.selectedIndex.set(0);
      } else if (currentIndex < currentSuggestions.length - 1) {
        // Navigate to next suggestion
        this.selectedIndex.set(currentIndex + 1);
      } else {
        // At last suggestion - deselect and move cursor to end
        this.selectedIndex.set(-1);
        this.showSuggestions.set(false);
        if (inputEl) {
          requestAnimationFrame(() => {
            inputEl.focus();
            const endPos = this.filterText().length;
            inputEl.setSelectionRange(endPos, endPos);
            this.cursorPosition = endPos;
          });
        }
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!suggestionsVisible || currentSuggestions.length === 0) {
        // Suggestions not showing - move cursor to start
        this.showSuggestions.set(false);
        this.selectedIndex.set(-1);
        if (inputEl) {
          requestAnimationFrame(() => {
            inputEl.focus();
            inputEl.setSelectionRange(0, 0);
            this.cursorPosition = 0;
          });
        }
      } else if (currentIndex === -1) {
        // No selection - select last suggestion
        this.selectedIndex.set(currentSuggestions.length - 1);
      } else if (currentIndex > 0) {
        // Navigate to previous suggestion
        this.selectedIndex.set(currentIndex - 1);
      } else {
        // At first suggestion - deselect and move cursor to start
        this.selectedIndex.set(-1);
        this.showSuggestions.set(false);
        if (inputEl) {
          requestAnimationFrame(() => {
            inputEl.focus();
            inputEl.setSelectionRange(0, 0);
            this.cursorPosition = 0;
          });
        }
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (currentIndex >= 0 && currentIndex < currentSuggestions.length) {
        this.applySuggestion(currentSuggestions[currentIndex], input);
      } else {
        this.applyFilter();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.showSuggestions.set(false);
      this.selectedIndex.set(-1);
    } else if (event.key === ' ' && event.ctrlKey) {
      event.preventDefault();
      this.cursorPosition = input.selectionStart || 0;
      this.updateSuggestions(this.filterText(), true);
    }
  }

  onInputFocus(input: HTMLInputElement): void {
    this.cursorPosition = input.selectionStart || 0;
  }

  onInputClick(input: HTMLInputElement): void {
    this.cursorPosition = input.selectionStart || 0;
  }

  applySuggestion(suggestion: AutocompleteSuggestion, input: HTMLInputElement): void {
    const text = this.filterText();
    const beforeCursor = text.substring(0, this.cursorPosition);
    const afterCursor = text.substring(this.cursorPosition);
    
    // Find the start of the current token
    const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
    const tokenStart = lastSpaceIndex >= 0 ? lastSpaceIndex + 1 : 0;
    
    // Replace the current token with the suggestion
    const newText = text.substring(0, tokenStart) + suggestion.text + afterCursor;
    this.filterText.set(newText);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = tokenStart + suggestion.text.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      this.cursorPosition = newCursorPos;
    }, 0);
    
    this.showSuggestions.set(false);
    this.selectedIndex.set(-1);
  }

  selectSuggestion(suggestion: AutocompleteSuggestion, input: HTMLInputElement): void {
    this.applySuggestion(suggestion, input);
  }

  applyFilter(): void {
    this.saveToStorage();
    this.filterChange.emit(this.filterText());
    this.showSuggestions.set(false);
  }

  appendText(text: string): void {
    const current = this.filterText();
    const newText = current ? current.trimEnd() + ' ' + text : text;
    this.filterText.set(newText);
    this.cursorPosition = newText.length;
    this.saveToStorage();
    this.filterChange.emit(newText);
    this.showSuggestions.set(false);
  }

  clearFilter(): void {
    this.filterText.set('');
    this.saveToStorage();
    this.filterChange.emit('');
    this.showSuggestions.set(false);
  }

  // ===== LOCAL STORAGE PERSISTENCE =====

  private loadFromStorage(): string | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored;
    } catch (e) {
      console.error('Failed to load filter from localStorage:', e);
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, this.filterText());
    } catch (e) {
      console.error('Failed to save filter to localStorage:', e);
    }
  }

  private updateSuggestions(text: string, explicit = false): void {
    const beforeCursor = text.substring(0, this.cursorPosition);
    // Find current token – stop at whitespace but also at ( and )
    const tokenMatch = beforeCursor.match(/[^\s()]*$/);
    const currentToken = tokenMatch ? tokenMatch[0] : '';

    const suggestions: AutocompleteSuggestion[] = [];

    const tokenLower = currentToken.toLowerCase();

    // Top-level EQL keywords
    const eqlKeywords: AutocompleteSuggestion[] = [
      { text: 'AND', description: 'Logical AND' },
      { text: 'OR', description: 'Logical OR' },
      { text: 'NOT', description: 'Logical NOT' },
      { text: 'date:gte:', description: 'Transaction date ≥ (e.g. date:gte:2024-01-01)' },
      { text: 'date:lte:', description: 'Transaction date ≤ (e.g. date:lte:2024-12-31)' },
      { text: 'date:eq:', description: 'Transaction date = (e.g. date:eq:2024-06-01)' },
      { text: 'date:between:', description: 'Date range (e.g. date:between:2024-01-01..2024-12-31)' },
      { text: 'partner:', description: 'Partner ID (glob/regex supported, e.g. partner:*ACME*)' },
      { text: 'description:', description: 'Description (glob/regex, e.g. description:*invoice*)' },
      { text: 'commodity:', description: 'Commodity code (e.g. commodity:CHF)' },
      { text: 'amount:gte:', description: 'Amount ≥ value (e.g. amount:gte:0)' },
      { text: 'amount:lte:', description: 'Amount ≤ value' },
      { text: 'amount:eq:', description: 'Amount = value' },
      { text: 'note:', description: 'Entry note (glob/regex, e.g. note:*receipt*)' },
      { text: 'tag:', description: 'Tag key (e.g. tag:invoice) or key+value (e.g. tag:invoice:PI001)' },
      { text: 'accounttype:', description: 'Account type: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, CASH' },
      { text: 'accountname:', description: 'Account path (glob/regex, e.g. accountname:*Expenses:Marketing*)' },
    ];

    // Filter keywords by current token prefix
    eqlKeywords
      .filter(s => s.text.toLowerCase().startsWith(tokenLower))
      .forEach(s => suggestions.push(s));

    // If we are typing a tag: predicate, add known tag keys/values
    if (tokenLower.startsWith('tag:')) {
      const afterTag = currentToken.substring(4);
      const colonIdx = afterTag.indexOf(':');
      if (colonIdx < 0) {
        // Suggest tag keys
        const uniqueKeys = Array.from(new Set(this.tags.map(t => t.key)));
        uniqueKeys
          .filter(key => key.toLowerCase().startsWith(afterTag.toLowerCase()))
          .forEach(key => {
            suggestions.push({ text: `tag:${key}`, description: `Filter by tag key: ${key}` });
          });
      } else {
        // Suggest tag values for the given key
        const tagKey = afterTag.substring(0, colonIdx);
        const valuePrefix = afterTag.substring(colonIdx + 1);
        const uniqueValues = Array.from(new Set(
          this.tags.filter(t => t.key === tagKey && t.value).map(t => t.value)
        ));
        uniqueValues
          .filter(v => v.toLowerCase().startsWith(valuePrefix.toLowerCase()))
          .forEach(v => {
            suggestions.push({ text: `tag:${tagKey}:${v}`, description: `${tagKey} = ${v}` });
          });
      }
    }

    this.suggestions.set(suggestions);
    if (suggestions.length > 0 && (explicit || currentToken.length > 0)) {
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
    }
  }
}
