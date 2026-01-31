import { Component, inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface ContentItem {
  id: number;
  title: string;
  type: 'video' | 'quiz' | 'pdf' | 'article';
  author: string;
  status: 'published' | 'draft';
  createdDate: string;
}

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './content-list.html',
  styleUrl: './content-list.scss',
})
export class ContentList {
  private readonly _router = inject(Router);

  items: ContentItem[] = [
    {
      id: 1,
      title: 'Angular Fundamentals',
      type: 'video',
      author: 'John Doe',
      status: 'published',
      createdDate: '2024-03-01',
    },
    {
      id: 2,
      title: 'Reactive Forms Deep Dive',
      type: 'article',
      author: 'Jane Smith',
      status: 'draft',
      createdDate: '2024-04-12',
    },
    {
      id: 3,
      title: 'Unit Testing Best Practices',
      type: 'pdf',
      author: 'Alex Johnson',
      status: 'published',
      createdDate: '2024-02-20',
    },
  ];

  search = '';
  filter: 'all' | 'published' | 'draft' = 'all';

  get filtered(): ContentItem[] {
    let list = [...this.items];
    if (this.search.trim()) {
      const term = this.search.toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(term) || i.author.toLowerCase().includes(term)
      );
    }
    if (this.filter !== 'all') list = list.filter((i) => i.status === this.filter);
    return list;
  }

  viewItem(id: number): void {
    // For now navigate to the item route if available; otherwise no-op
    const base = this._router.url.includes('/admin') ? '/admin/content' : '/student/content';
    this._router.navigate([`${base}/${id}`]);
  }
}