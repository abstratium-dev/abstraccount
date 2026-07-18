import { Routes } from '@angular/router';
import { AccountLedgerComponent } from './account-ledger/account-ledger.component';
import { AccountsTableComponent } from './accounts-table/accounts-table.component';
import { CloseBooksComponent } from './close-books/close-books.component';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { SignedInComponent } from './core/signed-in/signed-in.component';
import { SignedOutComponent } from './core/signed-out/signed-out.component';
import { CreateJournalComponent } from './create-journal/create-journal.component';
import { EntrySearchComponent } from './entry-search/entry-search.component';
import { JournalHistoryComponent } from './journal-history/journal-history.component';
import { JournalComponent } from './journal/journal.component';
import { LandingComponent } from './landing/landing.component';
import { LegalComponent } from './legal/legal.component';
import { MacrosComponent } from './macros/macros.component';
import { NewYearComponent } from './new-year/new-year.component';
import { PartnersComponent } from './partners/partners.component';
import { ReportsComponent } from './reports/reports.component';
import { SettingsComponent } from './settings/settings.component';
import { UploadComponent } from './upload/upload.component';

export const routes: Routes = [
  { path: '',                          component: LandingComponent },
  { path: 'journal',                   component: JournalComponent, canActivate: [authGuard] },
  { path: 'accounts-table',            component: AccountsTableComponent, canActivate: [authGuard] },
  { path: 'account/:accountId/ledger', component: AccountLedgerComponent, canActivate: [authGuard] },
  { path: 'upload',                    component: UploadComponent, canActivate: [authGuard] },
  { path: 'create-journal',            component: CreateJournalComponent, canActivate: [authGuard] },
  { path: 'settings',                  component: SettingsComponent, canActivate: [authGuard] },
  { path: 'signed-out',                component: SignedOutComponent },
  { path: 'reports',                   component: ReportsComponent, canActivate: [authGuard] },
  { path: 'partners',                  component: PartnersComponent, canActivate: [authGuard] },
  { path: 'macros',                    component: MacrosComponent, canActivate: [authGuard] },
  { path: 'entry-search',              component: EntrySearchComponent, canActivate: [authGuard] },
  { path: 'close-books',               component: CloseBooksComponent, canActivate: [authGuard] },
  { path: 'new-year',                  component: NewYearComponent, canActivate: [authGuard] },
  { path: 'journal-history',           component: JournalHistoryComponent, canActivate: [authGuard] },
  { path: 'legal',                     component: LegalComponent },
  { path: 'signed-in',                 component: SignedInComponent, canActivate: [authGuard] },
  { path: 'signed-out',                component: SignedOutComponent },
  { path: '**',                        component: NotFoundComponent }
];
