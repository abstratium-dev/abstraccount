import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

// Helper to create an error observable
function throwOf(error: any) {
  return throwError(() => error);
}
import { MaintenanceComponent } from './maintenance.component';

describe('MaintenanceComponent', () => {
  let component: MaintenanceComponent;
  let fixture: ComponentFixture<MaintenanceComponent>;
  let mockHttp: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    mockHttp = jasmine.createSpyObj('HttpClient', ['get']);

    await TestBed.configureTestingModule({
      imports: [MaintenanceComponent],
      providers: [{ provide: HttpClient, useValue: mockHttp }]
    }).compileComponents();

    fixture = TestBed.createComponent(MaintenanceComponent);
    component = fixture.componentInstance;
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('sets maintenance flag and message when toggle is active', async () => {
    mockHttp.get.and.returnValue(of({
      'going-down-for-maintenance': 'Maintenance scheduled for 2026-01-01 02:00 UTC'
    }));

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.hasMaintenanceScheduled()).toBeTrue();
    expect(component.maintenanceMessage()).toBe('Maintenance scheduled for 2026-01-01 02:00 UTC');
  });

  it('does not set maintenance when toggle is off', async () => {
    mockHttp.get.and.returnValue(of({ 'going-down-for-maintenance': 'off' }));

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.hasMaintenanceScheduled()).toBeFalse();
    expect(component.maintenanceMessage()).toBe('');
  });

  it('does not set maintenance when toggle value is empty', async () => {
    mockHttp.get.and.returnValue(of({ 'going-down-for-maintenance': '' }));

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.hasMaintenanceScheduled()).toBeFalse();
    expect(component.maintenanceMessage()).toBe('');
  });

  it('does not set maintenance when toggle key is missing', async () => {
    mockHttp.get.and.returnValue(of({}));

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.hasMaintenanceScheduled()).toBeFalse();
    expect(component.maintenanceMessage()).toBe('');
  });

  it('handles HTTP error gracefully', async () => {
    mockHttp.get.and.returnValue(throwError(() => new Error('Network error')));

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.hasMaintenanceScheduled()).toBeFalse();
    expect(component.maintenanceMessage()).toBe('');
  });
});
