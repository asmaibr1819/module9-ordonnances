import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChatSidebarComponent } from './features/chat/components/chat-sidebar/chat-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ChatSidebarComponent],
  template: `
    <div class="app-shell">
      <app-chat-sidebar></app-chat-sidebar>
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      height: 100dvh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--color-bg-main);
      color: var(--color-text-main);
    }
    .app-content {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }
  `]
})
export class AppComponent {}
