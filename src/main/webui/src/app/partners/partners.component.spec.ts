import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnersComponent } from './partners.component';
import { ModelService } from '../model.service';
import { signal } from '@angular/core';

describe('PartnersComponent', () => {
  let component: PartnersComponent;
  let fixture: ComponentFixture<PartnersComponent>;
  let modelService: jasmine.SpyObj<ModelService>;

  beforeEach(async () => {
    const modelServiceSpy = jasmine.createSpyObj('ModelService', [], {
      transactions$: signal([
        {
          id: 'tx1',
          date: '2024-01-01',
          status: 'POSTED',
          description: 'Test transaction 1',
          partnerId: 'P00000001',
          partnerName: 'Partner One',
          tags: [],
          entries: []
        },
        {
          id: 'tx2',
          date: '2024-01-02',
          status: 'POSTED',
          description: 'Test transaction 2',
          partnerId: 'P00000001',
          partnerName: 'Partner One',
          tags: [],
          entries: []
        },
        {
          id: 'tx3',
          date: '2024-01-03',
          status: 'POSTED',
          description: 'Test transaction 3',
          partnerId: 'P00000002',
          partnerName: 'Partner Two',
          tags: [],
          entries: []
        }
      ])
    });

    await TestBed.configureTestingModule({
      imports: [PartnersComponent],
      providers: [
        { provide: ModelService, useValue: modelServiceSpy }
      ]
    }).compileComponents();

    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    fixture = TestBed.createComponent(PartnersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load partners from transactions', () => {
    component.ngOnInit();
    
    expect(component.partners.length).toBe(2);
    expect(component.partners[0].partnerId).toBe('P00000001');
    expect(component.partners[0].partnerName).toBe('Partner One');
    expect(component.partners[0].transactionCount).toBe(2);
    expect(component.partners[1].partnerId).toBe('P00000002');
    expect(component.partners[1].partnerName).toBe('Partner Two');
    expect(component.partners[1].transactionCount).toBe(1);
  });

  it('should sort by partner name by default', () => {
    component.ngOnInit();
    
    expect(component.sortColumn).toBe('partnerName');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].partnerName).toBe('Partner One');
    expect(component.partners[1].partnerName).toBe('Partner Two');
  });

  it('should toggle sort direction when clicking same column', () => {
    component.ngOnInit();
    
    component.onColumnSort('partnerName');
    expect(component.sortDirection).toBe('desc');
    expect(component.partners[0].partnerName).toBe('Partner Two');
    expect(component.partners[1].partnerName).toBe('Partner One');
  });

  it('should sort by different column', () => {
    component.ngOnInit();
    
    component.onColumnSort('transactionCount');
    expect(component.sortColumn).toBe('transactionCount');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].transactionCount).toBe(1);
    expect(component.partners[1].transactionCount).toBe(2);
  });

  it('should show sort indicator for current column', () => {
    component.sortColumn = 'partnerName';
    component.sortDirection = 'asc';
    
    expect(component.getSortIndicator('partnerName')).toBe(' ▲');
    expect(component.getSortIndicator('partnerId')).toBe('');
  });
});
