import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, Footer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  currentBatchYear = new Date().getFullYear() + 1;
}

