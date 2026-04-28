import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, Token } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { Controller, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';

@Component({
    selector: 'header',
    imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
    private authService = inject(AuthService);
    private controller = inject(Controller);
    private modelService = inject(ModelService);
    private router = inject(Router);
    themeService = inject(ThemeService);

    token!: Token;
    isSignedIn = false;
    sessionFraction = 1;
    sessionMinutesRemaining = 0;
    journals: JournalMetadataDTO[] = [];
    selectedJournalId: string | null = null;
    readonly IMPORT_OPTION = '__IMPORT__';
    readonly CREATE_OPTION = '__CREATE__';
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

    async ngOnInit(): Promise<void> {
        if (this.isSignedIn) {
            await this.loadJournals();
        }
    }
    
    async loadJournals(): Promise<void> {
        try {
            this.journals = await this.controller.listJournals();
            
            // Auto-select if only one journal and none selected
            if (this.journals.length === 1 && !this.selectedJournalId) {
                this.selectedJournalId = this.journals[0].id;
                await this.onJournalSelected();
            }
        } catch (err) {
            console.error('Failed to load journals:', err);
        }
    }
    
    async onJournalSelected(): Promise<void> {
        if (this.selectedJournalId === this.IMPORT_OPTION) {
            // Navigate to upload page
            this.router.navigate(['/upload']);
            // Reset to previous selection
            this.selectedJournalId = this.modelService.getSelectedJournalId();
        } else if (this.selectedJournalId === this.CREATE_OPTION) {
            // Navigate to create journal page
            this.router.navigate(['/create-journal']);
            // Reset to previous selection
            this.selectedJournalId = this.modelService.getSelectedJournalId();
        } else if (this.selectedJournalId) {
            this.controller.selectJournal(this.journals.find(j => j.id === this.selectedJournalId)?.id || null);
        } else {
            this.controller.selectJournal(null);
        }
    }

    get sessionClockDashoffset(): number {
        const circumference = 2 * Math.PI * 7;
        return circumference * (1 - this.sessionFraction);
    }

    toggleTheme(): void {
        this.themeService.toggleTheme();
    }

    signout() {
        this.authService.signout();
    }

    toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu(): void {
        this.menuOpen = false;
    }
}
