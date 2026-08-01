import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-guide',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-guide.component.html',
  styleUrl: './user-guide.component.scss'
})
export class UserGuideComponent {
}
