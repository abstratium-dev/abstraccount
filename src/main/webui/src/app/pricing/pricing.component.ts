import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface PricingTier {
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaEnabled: boolean;
  featured: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  private authService = inject(AuthService);

  tiers: PricingTier[] = [
    {
      name: 'Free',
      price: '0 €',
      priceSuffix: '/ month',
      description: 'Everything you need to get started with double-entry bookkeeping.',
      features: [
        'Full access to core accounting features',
        'Online help and documentation',
        'Community support',
      ],
      ctaLabel: 'Get Started',
      ctaEnabled: true,
      featured: false,
    },
    {
      name: 'Pro',
      price: '5 €',
      priceSuffix: '/ month',
      description: 'For businesses that want faster, AI-assisted support when it matters.',
      features: [
        'Everything in Free',
        '24-hour email support',
        'AI assistance for creating transactions',
        'AI assistance for creating reports',
      ],
      ctaLabel: 'Coming soon',
      ctaEnabled: false,
      featured: true,
    },
  ];

  signIn(): void {
    this.authService.signIn();
  }
}
