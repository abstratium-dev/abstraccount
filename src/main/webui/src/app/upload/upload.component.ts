import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Controller } from '../controller';

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

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      
      try {
        const result = await this.controller.uploadJournal(content);
        this.uploading = false;
        this.uploadResult = result;
      } catch (error: any) {
        this.uploading = false;
        this.uploadError = error.error?.message || 'Upload failed';
      }
    };
    
    reader.onerror = () => {
      this.uploading = false;
      this.uploadError = 'Failed to read file';
    };
    
    reader.readAsText(file);
  }

  viewJournal() {
    this.router.navigate(['/journal']);
  }
}
