import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="chat-header">
      <div class="header-left">
        <div class="title-group">
          <h2 class="conversation-title">{{ title() }}</h2>
          <span class="session-badge">Clinical Session</span>
        </div>
      </div>
      <div class="header-right">
        <div class="api-status">
          <span class="status-dot"></span>
          <span class="status-text">Backend Connected</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .chat-header {
      height: var(--header-height);
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      z-index: var(--z-index-sticky);
    }
    .title-group { display: flex; flex-direction: column; gap: 2px; }
    .conversation-title { 
      font-size: 1.1rem; 
      font-weight: 600; 
      color: var(--color-primary); 
      margin: 0; 
      line-height: 1.2;
    }
    .session-badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .api-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-bg-main);
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
    }
    .status-dot { 
      width: 6px; 
      height: 6px; 
      background: var(--color-success); 
      border-radius: 50%; 
      box-shadow: 0 0 4px var(--color-success);
    }
    .status-text { font-weight: 500; }
  `]
})
export class ChatHeaderComponent {
  private convService = inject(ConversationService);
  title = computed(() => this.convService.activeConversation()?.title || 'Medical AI Assistant');
}
