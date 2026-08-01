import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterInputComponent } from './filter-input.component';
import { TagDTO } from '../../controller';

describe('FilterInputComponent', () => {
  let component: FilterInputComponent;
  let fixture: ComponentFixture<FilterInputComponent>;

  const mockTags: TagDTO[] = [
    { key: 'invoice', value: 'INV-001' },
    { key: 'invoice', value: 'INV-002' },
    { key: 'project', value: 'PRJ-001' }
  ];

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [FilterInputComponent, CommonModule, FormsModule],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(FilterInputComponent);
    component = fixture.componentInstance;
    component.tags = mockTags;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads filter from localStorage on init', () => {
    localStorage.setItem(component.storageKey, 'date:gte:2024-01-01');
    component.ngOnInit();
    expect(component.filterText()).toBe('date:gte:2024-01-01');
  });

  it('emits filterChange on init with loaded value', () => {
    let emittedValue = '';
    component.filterChange.subscribe(v => emittedValue = v);
    localStorage.setItem(component.storageKey, 'amount:gte:0');
    component.ngOnInit();
    expect(emittedValue).toBe('amount:gte:0');
  });

  it('emits empty filter on init when no stored value', () => {
    let emittedValue = 'unchanged';
    component.filterChange.subscribe(v => emittedValue = v);
    component.ngOnInit();
    expect(emittedValue).toBe('');
  });

  it('removes "null" string from storage', () => {
    localStorage.setItem(component.storageKey, 'null');
    component.ngOnInit();
    expect(component.filterText()).toBe('');
    expect(localStorage.getItem(component.storageKey)).toBeNull();
  });

  it('removes "undefined" string from storage', () => {
    localStorage.setItem(component.storageKey, 'undefined');
    component.ngOnInit();
    expect(component.filterText()).toBe('');
  });

  it('onInputChange updates filter text', () => {
    component.onInputChange('date:gte:2024-06-01');
    expect(component.filterText()).toBe('date:gte:2024-06-01');
  });

  it('applyFilter saves to storage and emits', () => {
    let emittedValue = '';
    component.filterChange.subscribe(v => emittedValue = v);
    component.filterText.set('description:*invoice*');
    component.applyFilter();
    expect(localStorage.getItem(component.storageKey)).toBe('description:*invoice*');
    expect(emittedValue).toBe('description:*invoice*');
    expect(component.showSuggestions()).toBeFalse();
  });

  it('appendText appends to existing filter', () => {
    component.filterText.set('date:gte:2024-01-01');
    component.appendText('AND');
    expect(component.filterText()).toBe('date:gte:2024-01-01 AND');
  });

  it('appendText sets text when filter is empty', () => {
    component.filterText.set('');
    component.appendText('date:gte:2024-01-01');
    expect(component.filterText()).toBe('date:gte:2024-01-01');
  });

  it('clearFilter resets filter text and emits', () => {
    let emittedValue = 'unchanged';
    component.filterChange.subscribe(v => emittedValue = v);
    component.filterText.set('some filter');
    component.clearFilter();
    expect(component.filterText()).toBe('');
    expect(emittedValue).toBe('');
    expect(localStorage.getItem(component.storageKey)).toBe('');
  });

  it('shows EQL keyword suggestions when typing', () => {
    component.cursorPosition = 3;
    component.filterText.set('dat');
    component['updateSuggestions']('dat');
    expect(component.suggestions().length).toBeGreaterThan(0);
    expect(component.suggestions().some(s => s.text.startsWith('date:'))).toBeTrue();
  });

  it('shows tag key suggestions when typing tag:', () => {
    component.cursorPosition = 4;
    component.filterText.set('tag:');
    component['updateSuggestions']('tag:');
    const tagSuggestions = component.suggestions().filter(s => s.text.startsWith('tag:'));
    expect(tagSuggestions.length).toBeGreaterThan(0);
    expect(tagSuggestions.some(s => s.text.includes('invoice'))).toBeTrue();
    expect(tagSuggestions.some(s => s.text.includes('project'))).toBeTrue();
  });

  it('shows tag value suggestions when typing tag:key:', () => {
    component.cursorPosition = 12; // Full length of 'tag:invoice:'
    component.filterText.set('tag:invoice:');
    component['updateSuggestions']('tag:invoice:');
    const tagSuggestions = component.suggestions().filter(s => s.text.startsWith('tag:invoice:'));
    expect(tagSuggestions.length).toBe(2);
    expect(tagSuggestions.some(s => s.text === 'tag:invoice:INV-001')).toBeTrue();
    expect(tagSuggestions.some(s => s.text === 'tag:invoice:INV-002')).toBeTrue();
  });

  it('hides suggestions when no token is being typed', () => {
    component.cursorPosition = 0;
    component.filterText.set('');
    component['updateSuggestions']('');
    expect(component.showSuggestions()).toBeFalse();
  });

  it('shows suggestions explicitly via Ctrl+Space', () => {
    component.cursorPosition = 0;
    component.filterText.set('');
    component['updateSuggestions']('', true);
    expect(component.showSuggestions()).toBeTrue();
  });

  it('selectSuggestion applies the suggestion', () => {
    const mockInput = {
      setSelectionRange: jasmine.createSpy('setSelectionRange')
    } as unknown as HTMLInputElement;
    component.filterText.set('dat');
    component.cursorPosition = 3;
    component.selectSuggestion({ text: 'date:gte:' }, mockInput);
    expect(component.filterText()).toBe('date:gte:');
    expect(component.showSuggestions()).toBeFalse();
  });

  it('applySuggestion replaces current token', () => {
    const mockInput = {
      setSelectionRange: jasmine.createSpy('setSelectionRange')
    } as unknown as HTMLInputElement;
    component.filterText.set('date:gte:2024-01-01 AND dat');
    component.cursorPosition = 25;
    component.applySuggestion({ text: 'date:lte:' }, mockInput);
    expect(component.filterText()).toContain('date:lte:');
    expect(component.filterText()).toContain('date:gte:2024-01-01 AND');
  });

  it('onKeyDown Enter applies filter when no suggestion selected', () => {
    const mockInput = { selectionStart: 0 } as unknown as HTMLInputElement;
    component.filterText.set('date:gte:2024-01-01');
    component.selectedIndex.set(-1);
    let emittedValue = '';
    component.filterChange.subscribe(v => emittedValue = v);

    component.onKeyDown({ key: 'Enter', preventDefault: () => {} } as any, mockInput);

    expect(emittedValue).toBe('date:gte:2024-01-01');
  });

  it('onKeyDown Enter applies suggestion when one is selected', () => {
    const mockInput = {
      setSelectionRange: jasmine.createSpy('setSelectionRange')
    } as unknown as HTMLInputElement;
    component.filterText.set('dat');
    component.cursorPosition = 3;
    component.suggestions.set([{ text: 'date:gte:' }]);
    component.selectedIndex.set(0);
    component.showSuggestions.set(true);

    component.onKeyDown({ key: 'Enter', preventDefault: () => {} } as any, mockInput);

    expect(component.filterText()).toBe('date:gte:');
  });

  it('onKeyDown Escape closes suggestions', () => {
    const mockInput = {} as HTMLInputElement;
    component.showSuggestions.set(true);
    component.selectedIndex.set(0);

    component.onKeyDown({ key: 'Escape', preventDefault: () => {} } as any, mockInput);

    expect(component.showSuggestions()).toBeFalse();
    expect(component.selectedIndex()).toBe(-1);
  });

  it('onKeyDown ArrowDown selects first suggestion when none selected', () => {
    const mockInput = {} as HTMLInputElement;
    component.suggestions.set([{ text: 'AND' }, { text: 'OR' }]);
    component.showSuggestions.set(true);
    component.selectedIndex.set(-1);

    component.onKeyDown({ key: 'ArrowDown', preventDefault: () => {} } as any, mockInput);

    expect(component.selectedIndex()).toBe(0);
  });

  it('onKeyDown ArrowDown moves to next suggestion', () => {
    const mockInput = {} as HTMLInputElement;
    component.suggestions.set([{ text: 'AND' }, { text: 'OR' }]);
    component.showSuggestions.set(true);
    component.selectedIndex.set(0);

    component.onKeyDown({ key: 'ArrowDown', preventDefault: () => {} } as any, mockInput);

    expect(component.selectedIndex()).toBe(1);
  });

  it('onKeyDown ArrowUp selects last suggestion when none selected', () => {
    const mockInput = {} as HTMLInputElement;
    component.suggestions.set([{ text: 'AND' }, { text: 'OR' }]);
    component.showSuggestions.set(true);
    component.selectedIndex.set(-1);

    component.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} } as any, mockInput);

    expect(component.selectedIndex()).toBe(1);
  });

  it('onKeyDown ArrowUp moves to previous suggestion', () => {
    const mockInput = {} as HTMLInputElement;
    component.suggestions.set([{ text: 'AND' }, { text: 'OR' }]);
    component.showSuggestions.set(true);
    component.selectedIndex.set(1);

    component.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} } as any, mockInput);

    expect(component.selectedIndex()).toBe(0);
  });

  it('onInputFocus updates cursor position', () => {
    const mockInput = { selectionStart: 5 } as unknown as HTMLInputElement;
    component.onInputFocus(mockInput);
    expect(component.cursorPosition).toBe(5);
  });

  it('onInputClick updates cursor position', () => {
    const mockInput = { selectionStart: 10 } as unknown as HTMLInputElement;
    component.onInputClick(mockInput);
    expect(component.cursorPosition).toBe(10);
  });

  it('value setter updates filter text and saves to storage after init', () => {
    component.ngOnInit();
    component.value = 'amount:gte:100';
    expect(component.filterText()).toBe('amount:gte:100');
    expect(localStorage.getItem(component.storageKey)).toBe('amount:gte:100');
  });

  it('value setter emits filterChange after init', () => {
    component.ngOnInit();
    let emittedValue = '';
    component.filterChange.subscribe(v => emittedValue = v);
    component.value = 'commodity:CHF';
    expect(emittedValue).toBe('commodity:CHF');
  });
});
