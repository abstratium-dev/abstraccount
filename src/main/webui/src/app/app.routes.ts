import { Routes, UrlMatcher, UrlSegment, UrlMatchResult } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { LandingComponent } from './landing/landing.component';

// Matches both /reports (no report selected) and /reports/<reportName> (a
// report selected by name). Using one matcher for both shapes keeps a single
// route config object so the component is reused across navigations.
const reportsMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  if (segments.length === 1 && segments[0].path === 'reports') {
    return { consumed: segments };
  }
  if (segments.length === 2 && segments[0].path === 'reports') {
    return { consumed: segments, posParams: { reportName: segments[1] } };
  }
  return null;
};

export const routes: Routes = [
  { path: '',                          component: LandingComponent },
  {
    path: 'journal',
    canActivate: [authGuard],
    loadComponent: () => import('./journal/journal.component').then(m => m.JournalComponent)
  },
  {
    path: 'accounts-table',
    canActivate: [authGuard],
    loadComponent: () => import('./accounts-table/accounts-table.component').then(m => m.AccountsTableComponent)
  },
  {
    path: 'account/:accountId/ledger',
    canActivate: [authGuard],
    loadComponent: () => import('./account-ledger/account-ledger.component').then(m => m.AccountLedgerComponent)
  },
  {
    path: 'upload',
    canActivate: [authGuard],
    loadComponent: () => import('./upload/upload.component').then(m => m.UploadComponent)
  },
  {
    path: 'create-journal',
    canActivate: [authGuard],
    loadComponent: () => import('./create-journal/create-journal.component').then(m => m.CreateJournalComponent)
  },
  {
    path: 'signed-out',
    loadComponent: () => import('./core/signed-out/signed-out.component').then(m => m.SignedOutComponent)
  },
  // A single matcher route so that /reports and /reports/<reportName> share the
  // same route config. This lets Angular reuse the ReportsComponent instance (no
  // page reload) when navigating between the two while still exposing the
  // selected report's name as an optional path segment.
  {
    matcher: reportsMatcher,
    canActivate: [authGuard],
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent)
  },
  {
    path: 'partners',
    canActivate: [authGuard],
    loadComponent: () => import('./partners/partners.component').then(m => m.PartnersComponent)
  },
  {
    path: 'macros',
    canActivate: [authGuard],
    loadComponent: () => import('./macros/macros.component').then(m => m.MacrosComponent)
  },
  {
    path: 'entry-search',
    canActivate: [authGuard],
    loadComponent: () => import('./entry-search/entry-search.component').then(m => m.EntrySearchComponent)
  },
  {
    path: 'close-books',
    canActivate: [authGuard],
    loadComponent: () => import('./close-books/close-books.component').then(m => m.CloseBooksComponent)
  },
  {
    path: 'new-year',
    canActivate: [authGuard],
    loadComponent: () => import('./new-year/new-year.component').then(m => m.NewYearComponent)
  },
  {
    path: 'journal-history',
    canActivate: [authGuard],
    loadComponent: () => import('./journal-history/journal-history.component').then(m => m.JournalHistoryComponent)
  },
  {
    path: 'journal-management',
    canActivate: [authGuard],
    loadComponent: () => import('./journal-management/journal-management.component').then(m => m.JournalManagementComponent)
  },
  {
    path: 'legal',
    loadComponent: () => import('./legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pricing/pricing.component').then(m => m.PricingComponent)
  },
  {
    path: 'signed-in',
    canActivate: [authGuard],
    loadComponent: () => import('./core/signed-in/signed-in.component').then(m => m.SignedInComponent)
  },
  {
    path: 'user-guide',
    loadComponent: () => import('./user-guide/user-guide.component').then(m => m.UserGuideComponent)
  },
  {
    path: 'accounting-basics',
    loadComponent: () => import('./accounting-basics/accounting-basics.component').then(m => m.AccountingBasicsComponent)
  },
  { path: '**',                        component: NotFoundComponent }
];
