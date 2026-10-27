import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-container">
          <div class="logo-mark">Med</div>
          <div class="brand-text">
            <span class="brand-name">MedRAG</span>
            <span class="brand-tagline">Clinical Assistant</span>
          </div>
        </div>
      </div>

      <div class="sidebar-content">
        <button class="action-btn primary" (click)="createNewChat()">
          <span class="btn-icon">+</span>
          <span class="btn-text">New Consultation</span>
        </button>

        <div class="section-label">Recent Sessions</div>
        <div class="conv-list">
          <div *ngFor="let conv of conversations()" 
               [class.active]="conv.id === activeId()" 
               (click)="selectConv(conv.id)"
               class="conv-item">
            <span class="conv-icon">💬</span>
            <span class="conv-title">{{ conv.title }}</span>
          </div>
          <div *ngIf="conversations().length === 0" class="empty-state">
            No recent sessions found.
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="avatar">JD</div>
          <div class="user-info">
            <span class="user-name">Dr. Jane Doe</span>
            <span class="user-role">Medical Practitioner</span>
          </div>
        </div>
        <div class="system-status">
          <span class="status-indicator"></span>
          <span class="status-text">System Online</span>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      background-color: var(--color-bg-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      height: 100%;
      transition: transform 0.3s ease;
    }
    .sidebar-header {
      padding: 2rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .brand-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo-mark {
      background: var(--color-primary);
      color: white;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-name { 
      font-size: 1.25rem; 
      font-weight: 700; 
      color: var(--color-primary); 
      line-height: 1;
    }
    .brand-tagline { 
      font-size: 0.7rem; 
      color: var(--color-text-muted); 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .action-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .action-btn.primary {
      background-color: var(--color-primary);
      color: white;
    }
    .action-btn.primary:hover {
      background-color: var(--color-navy-800);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .btn-icon { font-size: 1.2rem; font-weight: 400; }
    .btn-text { font-size: 0.9rem; }

    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.75rem;
    }
    .conv-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .conv-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-text-main);
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .conv-item:hover { 
      background-color: var(--color-bg-main); 
      color: var(--color-primary);
    }
    .conv-item.active { 
      background-color: var(--color-accent-light); 
      color: var(--color-accent); 
      border-color: var(--color-accent);
      font-weight: 500; 
    }
    .conv-icon { opacity: 0.5; font-size: 1rem; }
    .conv-title { 
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empty-state {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      text-align: center;
      padding: 2rem 0;
      font-style: italic;
    }

    .sidebar-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--color-border);
      background-color: var(--color-slate-50);
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .avatar {
      width: 32px;
      height: 32px;
      background: var(--color-primary);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }
    .user-role { font-size: 0.7rem; color: var(--color-text-muted); }

    .system-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.7rem;
      color: var(--color-text-muted);
      justify-content: center;
    }
    .status-indicator {
      width: 6px;
      height: 6px;
      background-color: var(--color-success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--color-success);
    }
  `]
})
export class ChatSidebarComponent {
  private convService = inject(ConversationService);
  conversations = this.convService.conversations;
  activeId = this.convService.activeConversationId;

  createNewChat() {
    this.convService.createConversation();
  }

  selectConv(id: string) {
    this.convService.setActiveConversation(id);
  }
}
