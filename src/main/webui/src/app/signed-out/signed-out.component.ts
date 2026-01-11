import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signed-out',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signed-out.component.html',
  styleUrl: './signed-out.component.css'
})
export class SignedOutComponent {
  signIn(): void {
    // Navigate to the login endpoint which triggers OIDC authentication
    // This is a BROWSER navigation (not XHR), so Quarkus OIDC can redirect properly
    // Flow:
    // 1. Browser navigates to /api/auth/login
    // 2. Quarkus OIDC returns 302 to https://auth.abstratium.dev/oauth2/authorize (with PKCE)
    // 3. User authenticates at auth server
    // 4. Auth server redirects to /oauth/callback with authorization code
    // 5. Quarkus exchanges code for tokens and creates session cookie
    // 6. Quarkus redirects back to /api/auth/login (restore-path-after-redirect)
    // 7. LoginResource redirects to / (frontend home page)
    // 8. Angular loads, AuthService fetches user info, user is authenticated
    window.location.href = '/api/auth/login';
  }
}
