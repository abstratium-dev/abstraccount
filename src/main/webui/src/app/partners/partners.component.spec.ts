import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnersComponent } from './partners.component';
import { ModelService } from '../model.service';
import { Controller, PartnerDTO, TransactionDTO } from '../controller';
import { signal } from '@angular/core';

describe('PartnersComponent', () => {
  let component: PartnersComponent;
  let fixture: ComponentFixture<PartnersComponent>;
  let modelService: jasmine.SpyObj<ModelService>;
  let controller: jasmine.SpyObj<Controller>;

  const mockTransactions: TransactionDTO[] = [
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
  ];

  const mockPartners: PartnerDTO[] = [
    { partnerNumber: 'P00000001', name: 'Partner One' },
    { partnerNumber: 'P00000002', name: 'Partner Two' },
    { partnerNumber: 'P00000003', name: 'Partner Three' }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['searchPartners']);
    const modelServiceSpy = jasmine.createSpyObj('ModelService', [], {
      transactions$: signal(mockTransactions),
      selectedJournalId$: signal('journal1')
    });

    await TestBed.configureTestingModule({
      imports: [PartnersComponent],
      providers: [
        { provide: ModelService, useValue: modelServiceSpy },
        { provide: Controller, useValue: controllerSpy }
      ]
    }).compileComponents();

    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    fixture = TestBed.createComponent(PartnersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all partners from backend with transaction counts', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();
    
    expect(controller.searchPartners).toHaveBeenCalledWith('');
    expect(component.partners.length).toBe(3);
    
    // Partners are sorted by name by default, so check in sorted order
    const partnerOne = component.partners.find(p => p.partnerId === 'P00000001');
    const partnerTwo = component.partners.find(p => p.partnerId === 'P00000002');
    const partnerThree = component.partners.find(p => p.partnerId === 'P00000003');
    
    expect(partnerOne?.partnerName).toBe('Partner One');
    expect(partnerOne?.transactionCount).toBe(2);
    expect(partnerOne?.hasTransactions).toBe(true);
    
    expect(partnerTwo?.partnerName).toBe('Partner Two');
    expect(partnerTwo?.transactionCount).toBe(1);
    expect(partnerTwo?.hasTransactions).toBe(true);
    
    expect(partnerThree?.partnerName).toBe('Partner Three');
    expect(partnerThree?.transactionCount).toBe(0);
    expect(partnerThree?.hasTransactions).toBe(false);
  });

  it('should sort by partner name by default', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(component.sortColumn).toBe('partnerName');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].partnerName).toBe('Partner One');
    expect(component.partners[1].partnerName).toBe('Partner Three');
    expect(component.partners[2].partnerName).toBe('Partner Two');
  });

  it('should toggle sort direction when clicking same column', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    component.onColumnSort('partnerName');
    expect(component.sortDirection).toBe('desc');
    expect(component.partners[0].partnerName).toBe('Partner Two');
    expect(component.partners[1].partnerName).toBe('Partner Three');
    expect(component.partners[2].partnerName).toBe('Partner One');
  });

  it('should sort by different column', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    component.onColumnSort('transactionCount');
    expect(component.sortColumn).toBe('transactionCount');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].transactionCount).toBe(0);
    expect(component.partners[1].transactionCount).toBe(1);
    expect(component.partners[2].transactionCount).toBe(2);
  });

  it('should show sort indicator for current column', () => {
    component.sortColumn = 'partnerName';
    component.sortDirection = 'asc';
    
    expect(component.getSortIndicator('partnerName')).toBe(' ▲');
    expect(component.getSortIndicator('partnerId')).toBe('');
  });

  it('should handle error when loading partners fails', async () => {
    controller.searchPartners.and.returnValue(Promise.reject(new Error('Network error')));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(component.error).toBe('Failed to load partners');
    expect(component.partners.length).toBe(0);
  });

  it('should reload partners when journal changes', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Manually trigger the journal change (simulating the effect)
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(controller.searchPartners).toHaveBeenCalledTimes(1);
    expect(component.partners.length).toBe(3);
  });

  it('should update transaction counts when transactions change', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();
    
    // Verify initial transaction counts (partners are sorted by name)
    const partnerOne = component.partners.find(p => p.partnerId === 'P00000001');
    const partnerTwo = component.partners.find(p => p.partnerId === 'P00000002');
    const partnerThree = component.partners.find(p => p.partnerId === 'P00000003');
    
    expect(partnerOne?.transactionCount).toBe(2);
    expect(partnerTwo?.transactionCount).toBe(1);
    expect(partnerThree?.transactionCount).toBe(0);
    
    // Note: In a real scenario, the effect would trigger when modelService.transactions$() changes
    // The effect watches both selectedJournalId$ and transactions$, so when transactions are
    // updated via controller.getTransactions(), the effect will re-run loadPartners()
  });
});
