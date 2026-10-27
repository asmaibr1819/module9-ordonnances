import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-evidence-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <h3>Medical Evidence</h3>
      <div *ngIf="sources().length === 0" class="empty-state">
        No medical sources retrieved for this response.
      </div>
      <div class="source-list">
        <div *ngFor="let source of sources()" class="source-card">
          <div class="source-header">
            <span class="citation">{{ source.citation_id }}</span>
            <span class="score">{{ source.score ? (source.score * 100).toFixed(1) + '%' : '' }}</span>
          </div>
          <div class="source-title">{{ source.title }}</div>
          <div class="source-org">{{ source.source_name }}</div>
          <a *ngIf="source.source_url" [href]="source.source_url" target="_blank" class="url">View Document ↗</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel { padding: 1.5rem; flex: 1; overflow-y: auto; }
    h3 { font-size: 1rem; color: var(--color-primary); margin-bottom: 1rem; }
    .empty-state { color: var(--color-text-muted); font-size: 0.85rem; text-align: center; padding: 2rem 0; }
    .source-list { display: flex; flex-direction: column; gap: 1rem; }
    .source-card {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-white);
      transition: border-color 0.2s;
    }
    .source-card:hover { border-color: var(--color-accent); }
    .source-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .citation { font-weight: 700; color: var(--color-accent); font-size: 0.8rem; }
    .score { font-size: 0.75rem; color: var(--color-text-muted); }
    .source-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem; }
    .source-org { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.75rem; }
    .url { font-size: 0.8rem; color: var(--color-accent); text-decoration: none; font-weight: 500; }
  `]
})
export class EvidencePanelComponent {
  private convService = inject(ConversationService);
  sources = computed(() => {
    const messages = this.convService.activeConversation()?.messages || [];
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    return lastAssistantMsg?.sources || [];
  });
}
