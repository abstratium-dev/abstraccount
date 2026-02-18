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
  @Input() placeholder = 'Filter (e.g., begin:20240601 end:20241031 partner:*ABC invoice:*34 not:draft)';
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
    const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
    const currentToken = beforeCursor.substring(lastSpaceIndex >= 0 ? lastSpaceIndex + 1 : 0);

    const suggestions: AutocompleteSuggestion[] = [];

    // Check if token starts with 'not:'
    let isNegated = false;
    let tokenWithoutNot = currentToken;
    if (currentToken.startsWith('not:')) {
      isNegated = true;
      tokenWithoutNot = currentToken.substring(4);
    }

    // If token is empty or starts with a letter, suggest keywords and tag keys
    if (!tokenWithoutNot || /^[a-zA-Z]/.test(tokenWithoutNot)) {
      // Date keywords
      if ('begin:'.startsWith(tokenWithoutNot.toLowerCase())) {
        suggestions.push({ text: 'begin:yyyyMMdd', description: 'Start date filter (inclusive)' });
      }
      if ('end:'.startsWith(tokenWithoutNot.toLowerCase())) {
        suggestions.push({ text: 'end:yyyyMMdd', description: 'End date filter (exclusive)' });
      }
      if ('partner:'.startsWith(tokenWithoutNot.toLowerCase())) {
        suggestions.push({ text: 'partner:value', description: 'Filter by partner ID (supports wildcards)' });
      }
      if ('not:'.startsWith(currentToken.toLowerCase()) && !isNegated) {
        suggestions.push({ text: 'not:', description: 'Negate the following filter' });
      }

      // Tag keys
      const uniqueKeys = new Set<string>();
      this.tags.forEach(tag => uniqueKeys.add(tag.key));
      
      Array.from(uniqueKeys)
        .filter(key => key.toLowerCase().startsWith(tokenWithoutNot.toLowerCase()))
        .forEach(key => {
          const prefix = isNegated ? 'not:' : '';
          suggestions.push({ text: prefix + key, description: `${isNegated ? 'Exclude' : 'Filter by'} tag key: ${key}` });
          
          // Also suggest key:value patterns for this key
          const valuesForKey = this.tags
            .filter(tag => tag.key === key && tag.value)
            .map(tag => tag.value);
          
          const uniqueValues = Array.from(new Set(valuesForKey));
          uniqueValues.forEach(value => {
            suggestions.push({ text: `${prefix}${key}:${value}`, description: `${isNegated ? 'Exclude' : 'Filter by'} ${key} = ${value}` });
          });
        });
    } else if (tokenWithoutNot.includes(':')) {
      // If token contains ':', suggest values for that key
      const colonIndex = tokenWithoutNot.indexOf(':');
      const key = tokenWithoutNot.substring(0, colonIndex);
      const valuePrefix = tokenWithoutNot.substring(colonIndex + 1);

      // Special handling for date keywords
      if (key === 'begin' || key === 'end') {
        if (!valuePrefix) {
          suggestions.push({ text: `${key}:yyyyMMdd`, description: 'Date in yyyyMMdd format' });
        }
      } else if (key === 'partner') {
        if (!valuePrefix) {
          suggestions.push({ text: 'partner:*', description: 'Partner ID with wildcard' });
        }
      } else {
        // Tag values
        const valuesForKey = this.tags
          .filter(tag => tag.key === key && tag.value)
          .map(tag => tag.value);
        
        const uniqueValues = Array.from(new Set(valuesForKey));
        const prefix = isNegated ? 'not:' : '';
        uniqueValues
          .filter(value => value.toLowerCase().startsWith(valuePrefix.toLowerCase()))
          .forEach(value => {
            suggestions.push({ text: `${prefix}${key}:${value}`, description: `${isNegated ? 'Exclude' : 'Filter by'} ${key} = ${value}` });
            suggestions.push({ text: `${prefix}${key}:*${value}`, description: `${isNegated ? 'Exclude' : 'Filter by'} ${key} contains ${value}` });
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
