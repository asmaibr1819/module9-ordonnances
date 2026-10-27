import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHeaderComponent } from '../../components/chat-header/chat-header.component';
import { MessageListComponent } from '../../components/message-list/message-list.component';
import { MessageComposerComponent } from '../../components/message-composer/message-composer.component';
import { PatientContextPanelComponent } from '../../components/patient-context-panel/patient-context-panel.component';
import { EvidencePanelComponent } from '../../components/evidence-panel/evidence-panel.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatHeaderComponent,
    MessageListComponent,
    MessageComposerComponent,
    PatientContextPanelComponent,
    EvidencePanelComponent,
  ],
  template: `
    <div class="page-wrapper">
      <app-chat-header></app-chat-header>
      
      <div class="main-layout">
        <section class="consultation-area">
          <div class="scroll-container">
            <app-message-list></app-message-list>
          </div>
          <div class="input-area">
            <app-message-composer></app-message-composer>
          </div>
        </section>
        
        <aside class="clinical-sidebar">
          <div class="sidebar-content">
            <app-patient-context-panel></app-patient-context-panel>
            <div class="sidebar-divider"></div>
            <app-evidence-panel></app-evidence-panel>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .page-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background-color: var(--color-bg-main);
    }

    .main-layout {
      flex: 1;
      display: flex;
      min-height: 0;
      position: relative;
    }

    .consultation-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
      background: transparent;
    }

    .scroll-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding-bottom: 1rem;
    }

    .input-area {
      padding: 1.5rem 2rem;
      background: linear-gradient(to top, var(--color-bg-main) 80%, transparent);
    }

    .clinical-sidebar {
      width: 380px;
      border-left: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 10;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .sidebar-divider {
      height: 1px;
      background-color: var(--color-border);
      margin: 1.5rem 0;
    }

    @media (max-width: 1280px) {
      .clinical-sidebar {
        width: 320px;
      }
    }

    @media (max-width: 1024px) {
      .clinical-sidebar {
        display: none;
      }
      .consultation-area {
        max-width: 100%;
      }
    }
  `]
})
export class ChatPageComponent {}
