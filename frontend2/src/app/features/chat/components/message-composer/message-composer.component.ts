import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MedicalExtractionService } from '../../../../core/api/medical-extraction.service';
import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-message-composer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="composer-wrapper">
      <div class="composer-container">
        <form
          [formGroup]="chatForm"
          (ngSubmit)="onSubmit()"
          class="composer-form"
        >
          <div class="input-group">
            <textarea
              formControlName="query"
              placeholder="Describe the patient’s symptoms or clinical context..."
              [disabled]="isSending()"
            ></textarea>
            <button
              type="submit"
              [disabled]="chatForm.invalid || isSending()"
              class="send-btn"
            >
              <span *ngIf="!isSending()" class="btn-text">Send</span>
              <span *ngIf="isSending()" class="loading-spinner"></span>
            </button>
          </div>
        </form>

        <div class="error-message" *ngIf="errorMessage()">
          {{ errorMessage() }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .composer-wrapper {
        padding: 1.5rem 2rem;
        background: var(--color-bg-surface);
        border-top: 1px solid var(--color-border);
      }
      .composer-container {
        max-width: var(--max-content-width);
        margin: 0 auto;
      }
      .composer-form {
        display: flex;
        justify-content: center;
      }
      .input-group {
        display: flex;
        align-items: flex-end;
        gap: 0.75rem;
        width: 100%;
        background: var(--color-bg-main);
        padding: 0.75rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease;
      }
      .input-group:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
      textarea {
        flex: 1;
        border: none;
        background: transparent;
        resize: none;
        height: 40px;
        padding: 0.5rem;
        font-family: inherit;
        font-size: 0.95rem;
        outline: none;
        color: var(--color-text-primary);
        line-height: 1.5;
      }
      .send-btn {
        height: 36px;
        padding: 0 1.25rem;
        background-color: var(--color-primary);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 80px;
      }
      .send-btn:hover:not(:disabled) {
        background-color: var(--color-primary-hover);
        transform: translateY(-1px);
      }
      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .error-message {
        margin-top: 0.75rem;
        padding: 0.65rem 0.75rem;
        border-radius: var(--radius-sm);
        background: rgba(220, 38, 38, 0.08);
        border: 1px solid rgba(220, 38, 38, 0.2);
        color: #b91c1c;
        font-size: 0.82rem;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class MessageComposerComponent {
  private fb = inject(FormBuilder);
  private convService = inject(ConversationService);
  private medicalExtractionService = inject(MedicalExtractionService);

  isSending = signal(false);
  errorMessage = signal<string | null>(null);

  chatForm: FormGroup = this.fb.group({
    query: ['', [Validators.required]],
  });

  async onSubmit() {
    if (this.chatForm.invalid || this.isSending()) {
      return;
    }

    const queryText = this.chatForm.value.query?.trim();
    if (!queryText) {
      return;
    }

    const convId = this.convService.ensureConversation();
    this.isSending.set(true);
    this.errorMessage.set(null);

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: queryText,
      timestamp: new Date(),
    };

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: 'Extracting patient information...',
      timestamp: new Date(),
      status: 'loading' as const,
    };

    this.convService.appendMessage(convId, userMessage);
    this.convService.appendMessage(convId, assistantMessage);

    try {
      const startedAt = performance.now();
      const extraction = await firstValueFrom(
        this.medicalExtractionService.extractInformation(queryText),
      );
      const elapsedMs = performance.now() - startedAt;

      this.convService.setExtractionResult(convId, extraction, elapsedMs);
      this.convService.updateAssistantMessage(
        convId,
        assistantMessage.id,
        `Extraction completed (${(elapsedMs / 1000).toFixed(2)}s)`,
        'complete',
      );
      this.chatForm.reset();
    } catch (error) {
      console.error('Extraction error:', error);
      const message =
        'Unable to extract patient information. Please check the backend and try again.';
      this.errorMessage.set(message);
      this.convService.updateAssistantMessage(
        convId,
        assistantMessage.id,
        message,
        'error',
      );
    } finally {
      this.isSending.set(false);
    }
  }
}
