import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  // Social links - Team Contact
  socialLinks = [
    { icon: 'bi bi-whatsapp', label: 'WhatsApp', url: 'https://wa.me/201090038706' },
    { icon: 'bi bi-instagram', label: 'Instagram', url: 'https://www.instagram.com/ahmed_tawfiq9?igsh=MXRyZG0yZDA4cTkwdg==' },
    { icon: 'bi bi-facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1HUVBnuf5o/' },
    { icon: 'bi bi-linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/ahmed-mostafa-792533328' }
  ];

  currentYear = new Date().getFullYear();



}
