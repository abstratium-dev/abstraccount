import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { DemoComponent } from './demo/demo.component';
import { HomeComponent } from './core/home/home.component';

export const routes: Routes = [
  { path: '',         component: HomeComponent, canActivate: [authGuard] },
  { path: 'demo',   component: DemoComponent },
  { path: '**',       component: NotFoundComponent }
];
