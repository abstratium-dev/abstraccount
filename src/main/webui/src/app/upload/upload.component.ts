import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Controller, JournalConflictError } from '../controller';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  private controller = inject(Controller);
  private router = inject(Router);

  uploading = false;
  uploadResult: any = null;
  uploadError: string | null = null;
  pendingConflict: { journals: { id: string; title: string }[]; file: File } | null = null;
  private lastFile: File | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadFile(file);
    }
  }

  async uploadFile(file: File) {
    this.uploading = true;
    this.uploadResult = null;
    this.uploadError = null;
    this.pendingConflict = null;
    this.lastFile = file;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      await this.doUpload(content, false);
    };

    reader.onerror = () => {
      this.uploading = false;
      this.uploadError = 'Failed to read file';
    };

    reader.readAsText(file);
  }

  private async doUpload(content: string, replaceExisting: boolean) {
    this.uploading = true;
    this.uploadResult = null;
    this.uploadError = null;
    this.pendingConflict = null;

    try {
      const result = await this.controller.uploadJournal(content, replaceExisting);
      this.uploading = false;
      this.uploadResult = result;
    } catch (error: any) {
      this.uploading = false;
      if (error instanceof JournalConflictError) {
        this.pendingConflict = {
          journals: error.conflictingJournals,
          file: this.lastFile!
        };
      } else {
        this.uploadError = error.error?.message || 'Upload failed';
      }
    }
  }

  confirmReplace() {
    if (!this.pendingConflict || !this.lastFile) {
      return;
    }
    const file = this.lastFile;
    this.pendingConflict = null;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      await this.doUpload(content, true);
    };
    reader.readAsText(file);
  }

  cancelReplace() {
    this.pendingConflict = null;
    this.uploadError = null;
  }

  viewJournal() {
    this.router.navigate(['/journal']);
  }
}
