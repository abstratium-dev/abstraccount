import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Token } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';

@Component({
    selector: 'header',
    imports: [RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
})
export class HeaderComponent {
    private authService = inject(AuthService);
    private modelService = inject(ModelService);
    themeService = inject(ThemeService);
    protected brandLogoUrl$ = this.modelService.brandLogoUrl$;
    protected brandLogoAlt$ = this.modelService.brandLogoAlt$;
    protected brandName$ = this.modelService.brandName$;

    token!: Token;
    isSignedIn = false;
    sessionFraction = 1;
    sessionMinutesRemaining = 0;
    journals: JournalMetadataDTO[] = [];
    selectedJournalId: string | null = null;
    menuOpen = false;

    constructor() {
        effect(() => {
            this.token = this.authService.token$();
            this.isSignedIn = this.token.isAuthenticated;
        });

        effect(() => {
            this.sessionFraction = this.authService.sessionFraction$();
            this.sessionMinutesRemaining = this.authService.sessionMinutesRemaining$();
        });
        
        // Watch for journal list changes (e.g., after upload)
        effect(() => {
            this.journals = this.modelService.journals$();
        });
        
        // Watch for selected journal changes
        effect(() => {
            const selectedId = this.modelService.selectedJournalId$();
            if (selectedId !== this.selectedJournalId) {
                this.selectedJournalId = selectedId;
            }
        });
    }

    get currentJournalName(): string {
        return this.journals.find(journal => journal.id === this.selectedJournalId)?.title || 'No journal selected';
    }

    get currentJournalLocked(): boolean {
        return this.journals.find(journal => journal.id === this.selectedJournalId)?.locked ?? false;
    }

    get sessionClockDashoffset(): number {
        const circumference = 2 * Math.PI * 7;
        return circumference * (1 - this.sessionFraction);
    }

    toggleTheme(): void {
        this.themeService.toggleTheme();
    }

    signOut() {
        this.authService.signOut();
    }

    signIn() {
        this.authService.signIn();
    }

    toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu(): void {
        this.menuOpen = false;
    }
}
