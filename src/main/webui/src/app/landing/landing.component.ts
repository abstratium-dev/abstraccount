import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private authService = inject(AuthService);
  isSignedIn = false;

  constructor() {
    effect(() => {
      this.isSignedIn = this.authService.token$().isAuthenticated;
    });
  }

  signIn(): void {
    this.authService.signIn();
  }
}
