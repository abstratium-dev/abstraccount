import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  uploading = false;
  uploadResult: any = null;
  uploadError: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadFile(file);
    }
  }

  uploadFile(file: File) {
    this.uploading = true;
    this.uploadResult = null;
    this.uploadError = null;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      
      this.http.post('/api/journal/upload', content, {
        headers: { 'Content-Type': 'text/plain' }
      }).subscribe({
        next: (result) => {
          this.uploading = false;
          this.uploadResult = result;
        },
        error: (error) => {
          this.uploading = false;
          this.uploadError = error.error?.message || 'Upload failed';
        }
      });
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
