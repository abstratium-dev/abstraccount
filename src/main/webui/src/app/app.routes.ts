import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { SignedOutComponent } from './core/signed-out/signed-out.component';
import { JournalComponent } from './journal/journal.component';
import { UploadComponent } from './upload/upload.component';

export const routes: Routes = [
  { path: '',           component: JournalComponent, canActivate: [authGuard] },
  { path: 'journal',    component: JournalComponent, canActivate: [authGuard] },
  { path: 'upload',     component: UploadComponent, canActivate: [authGuard] },
  { path: 'signed-out', component: SignedOutComponent },
  { path: '**',         component: NotFoundComponent }
];
