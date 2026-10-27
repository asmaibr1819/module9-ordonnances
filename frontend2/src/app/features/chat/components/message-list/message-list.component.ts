import { Component, inject, signal, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="messages-container">
      <!-- Welcome State -->
      <div *ngIf="messages().length === 0" class="empty-state">
        <div class="welcome-content">
          <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="brand-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 class="text-primary">Clinical Assistant</h2>
          <p class="text-secondary">Enter patient symptoms or medical queries to begin a RAG-powered evidence synthesis.</p>
        </div>
      </div>

      <!-- Messages -->
      <div *ngFor="let msg of messages(); let last = last" 
           [class]="msg.role === 'user' ? 'message-row user' : 'message-row assistant'">
        
        <div class="message-content">
          <div class="label">
            <span class="role-name">{{ msg.role === 'user' ? 'Patient/User' : 'Medical AI' }}</span>
            <span class="timestamp">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>
          
          <div class="text-body">
            {{ msg.content }}
          </div>
        </div>
      </div>

      <!-- Streaming State -->
      <div *ngIf="isStreaming()" class="message-row assistant streaming">
        <div class="message-content">
          <div class="label">
            <span class="role-name">Medical AI</span>
            <span class="status-indicator">Synthesizing...</span>
          </div>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      padding: 2rem 0;
      width: 100%;
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 60vh;
      text-align: center;
    }

    .welcome-content {
      max-width: 400px;
    }

    .icon-wrapper {
      margin-bottom: 1.5rem;
      color: var(--color-primary);
      display: flex;
      justify-content: center;
    }

    .text-primary { color: var(--color-text-primary); }
    .text-secondary { color: var(--color-text-secondary); }

    .welcome-content h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }

    .welcome-content p {
      font-size: 1rem;
      line-height: 1.6;
      margin: 0;
    }

    .message-row {
      display: flex;
      flex-direction: column;
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    .message-row.user { align-items: flex-end; }
    .message-row.assistant { align-items: flex-start; }

    .message-content {
      max-width: 85%;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .user .message-content { align-items: flex-end; }

    .label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .role-name { color: var(--color-text-muted); }
    .timestamp { color: var(--color-text-muted); opacity: 0.7; }

    .status-indicator {
      color: var(--color-primary);
      font-style: italic;
      animation: pulse 1.5s infinite;
    }

    .text-body {
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--color-text-primary);
      white-space: pre-wrap;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
    }

    .user .text-body {
      background-color: var(--color-primary);
      color: white;
      border-bottom-right-radius: 0;
    }

    .assistant .text-body {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-bottom-left-radius: 0;
      box-shadow: var(--shadow-sm);
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      width: fit-content;
    }

    .typing-indicator span {
      width: 6px;
      height: 6px;
      background: var(--color-text-muted);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
  `]
})
export class MessageListComponent {
  private convService = inject(ConversationService);
  private el = inject(ElementRef);

  messages = this.convService.messages;
  isStreaming = this.convService.isStreaming;

  constructor() {
    effect(() => {
      if (this.messages().length > 0) {
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = this.el.nativeElement.querySelector('.scroll-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
