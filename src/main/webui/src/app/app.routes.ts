import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { SignedOutComponent } from './core/signed-out/signed-out.component';
import { JournalComponent } from './journal/journal.component';
import { UploadComponent } from './upload/upload.component';
import { AccountsComponent } from './accounts/accounts.component';
import { AccountLedgerComponent } from './account-ledger/account-ledger.component';
import { SettingsComponent } from './settings/settings.component';
import { ReportsComponent } from './reports/reports.component';

export const routes: Routes = [
  { path: '',                          component: JournalComponent, canActivate: [authGuard] },
  { path: 'journal',                   component: JournalComponent, canActivate: [authGuard] },
  { path: 'accounts',                  component: AccountsComponent, canActivate: [authGuard] },
  { path: 'account/:accountId/ledger', component: AccountLedgerComponent, canActivate: [authGuard] },
  { path: 'upload',                    component: UploadComponent, canActivate: [authGuard] },
  { path: 'settings',                  component: SettingsComponent, canActivate: [authGuard] },
  { path: 'signed-out',                component: SignedOutComponent },
  { path: 'reports',                   component: ReportsComponent, canActivate: [authGuard] },
  { path: '**',                        component: NotFoundComponent }
];
