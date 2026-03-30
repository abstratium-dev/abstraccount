import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { SignedOutComponent } from './core/signed-out/signed-out.component';
import { JournalComponent } from './journal/journal.component';
import { UploadComponent } from './upload/upload.component';
import { CreateJournalComponent } from './create-journal/create-journal.component';
import { AccountsComponent } from './accounts/accounts.component';
import { AccountLedgerComponent } from './account-ledger/account-ledger.component';
import { SettingsComponent } from './settings/settings.component';
import { ReportsComponent } from './reports/reports.component';
import { PartnersComponent } from './partners/partners.component';
import { MacrosComponent } from './macros/macros.component';
import { EntrySearchComponent } from './entry-search/entry-search.component';

export const routes: Routes = [
  { path: '',                          component: JournalComponent, canActivate: [authGuard] },
  { path: 'journal',                   component: JournalComponent, canActivate: [authGuard] },
  { path: 'accounts',                  component: AccountsComponent, canActivate: [authGuard] },
  { path: 'account/:accountId/ledger', component: AccountLedgerComponent, canActivate: [authGuard] },
  { path: 'upload',                    component: UploadComponent, canActivate: [authGuard] },
  { path: 'create-journal',            component: CreateJournalComponent, canActivate: [authGuard] },
  { path: 'settings',                  component: SettingsComponent, canActivate: [authGuard] },
  { path: 'signed-out',                component: SignedOutComponent },
  { path: 'reports',                   component: ReportsComponent, canActivate: [authGuard] },
  { path: 'partners',                  component: PartnersComponent, canActivate: [authGuard] },
  { path: 'macros',                    component: MacrosComponent, canActivate: [authGuard] },
  { path: 'entry-search',              component: EntrySearchComponent, canActivate: [authGuard] },
  { path: '**',                        component: NotFoundComponent }
];
