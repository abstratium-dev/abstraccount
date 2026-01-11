import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { DemoComponent } from './demo/demo.component';
import { SignedOutComponent } from './signed-out/signed-out.component';

export const routes: Routes = [
  { path: '',           component: DemoComponent, canActivate: [authGuard] },
  { path: 'demo',       component: DemoComponent, canActivate: [authGuard] },
  { path: 'signed-out', component: SignedOutComponent },
  { path: '**',         component: NotFoundComponent }
];
