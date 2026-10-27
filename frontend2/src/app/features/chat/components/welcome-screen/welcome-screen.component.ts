import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service'; 

@Component({
  selector: 'app-welcome-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="welcome-container">
      <div class="welcome-card">
        <div class="icon-header">⚕️</div>
        <h1>Medical AI Assistant</h1>
        <p class="description">
          Enter patient symptoms or a clinical query below. This tool provides evidence-based 
          information retrieved from medical documentation to support your clinical reasoning.
        </p>
        <div class="disclaimer">
          <span class="warning-icon">⚠️</span>
          <span>This assistant is for informational purposes and does not replace professional clinical judgment.</span>
        </div>
        
        <div class="suggestions-grid">
          <div class="suggestion" *ngFor="let s of suggestions" (click)="selectSuggestion(s.text)">
            <span class="suggestion-icon">💡</span>
            <span class="suggestion-text">{{ s.text }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      color: var(--color-text-main);
    }
    .welcome-card {
      max-width: 650px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .icon-header {
      font-size: 3rem;
      margin-bottom: 0.5rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--color-primary);
      margin: 0;
      line-height: 1.1;
    }
    .description {
      font-size: 1.1rem;
      color: var(--color-text-muted);
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }
    .disclaimer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--color-slate-100);
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      margin: 1rem 0;
    }
    .warning-icon { font-size: 1rem; }
    
    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      width: 100%;
      margin-top: 1rem;
    }
    .suggestion {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      padding: 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-align: left;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      color: var(--color-text-main);
    }
    .suggestion:hover {
      border-color: var(--color-accent);
      background-color: var(--color-accent-light);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .suggestion-icon { opacity: 0.6; }
  `]
})
export class WelcomeScreenComponent {
  private convService = inject(ConversationService);
  
  suggestions = [
    { text: 'Toux sèche depuis trois jours' },
    { text: 'Fièvre et maux de tête' },
    { text: 'Douleur abdominale aiguë' },
    { text: 'Essoufflement lors d\'un effort' }
  ];

  selectSuggestion(text: string) {
    console.log('Suggestion selected:', text);
    // Logic to populate composer would go here
  }
}
