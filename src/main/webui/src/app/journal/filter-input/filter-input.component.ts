import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, effect } from '@angular/core';
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
  @Input() placeholder = 'Filter (e.g., date:gte:2024-01-01 AND description:*invoice* AND NOT accounttype:EQUITY)';
  @Input() tags: TagDTO[] = [];
  @Output() filterChange = new EventEmitter<string>();

  filterText = signal('');
  suggestions = signal<AutocompleteSuggestion[]>([]);
  showSuggestions = signal(false);
  selectedIndex = signal(-1);
  cursorPosition = 0;

  constructor() {
    effect(() => {
      const text = this.filterText();
      this.updateSuggestions(text);
    });
  }

  ngOnInit(): void {
    this.updateSuggestions(this.filterText());
  }

  ngOnDestroy(): void {
  }

  onInputChange(value: string): void {
    this.filterText.set(value);
  }

  onKeyDown(event: KeyboardEvent, input: HTMLInputElement): void {
    const currentSuggestions = this.suggestions();
    const currentIndex = this.selectedIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (currentIndex < currentSuggestions.length - 1) {
        this.selectedIndex.set(currentIndex + 1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (currentIndex > 0) {
        this.selectedIndex.set(currentIndex - 1);
      } else {
        this.selectedIndex.set(-1);
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
      this.showSuggestions.set(true);
      this.cursorPosition = input.selectionStart || 0;
      this.updateSuggestions(this.filterText());
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
    const newText = text.substring(0, tokenStart) + suggestion.text + ' ' + afterCursor;
    this.filterText.set(newText);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = tokenStart + suggestion.text.length + 1;
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
    this.filterChange.emit(this.filterText());
    this.showSuggestions.set(false);
  }

  clearFilter(): void {
    this.filterText.set('');
    this.filterChange.emit('');
    this.showSuggestions.set(false);
  }

  private updateSuggestions(text: string): void {
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
    if (suggestions.length > 0 && currentToken.length > 0) {
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
    }
  }
}
