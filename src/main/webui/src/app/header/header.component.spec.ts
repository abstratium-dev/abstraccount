import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the current journal name and Journal Management menu entry without a selector', () => {
    component.isSignedIn = true;
    component.selectedJournalId = 'journal-id';
    component.journals = [{
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null
    }];
    component.menuOpen = true;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#journal-select')).toBeNull();
    const journalNameLink = fixture.nativeElement.querySelector('#current-journal-name');
    expect(journalNameLink.tagName).toBe('A');
    expect(journalNameLink.getAttribute('href')).toBe('/journal-management');
    expect(journalNameLink.textContent).toContain('Current Journal');
    expect(fixture.nativeElement.querySelector('#journal-management').getAttribute('href')).toBe('/journal-management');
  });
});
