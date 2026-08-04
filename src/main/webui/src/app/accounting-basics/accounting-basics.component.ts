import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accounting-basics',
  imports: [CommonModule, RouterLink],
  templateUrl: './accounting-basics.component.html',
  styleUrl: './accounting-basics.component.scss'
})
export class AccountingBasicsComponent {
}
