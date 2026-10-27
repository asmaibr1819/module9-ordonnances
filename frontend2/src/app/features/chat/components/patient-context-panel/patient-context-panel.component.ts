import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { ConversationService } from '../../../../core/services/conversation.service';

@Component({
  selector: 'app-patient-context-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <h3>Patient Context</h3>
        <span
          class="response-time"
          *ngIf="
            extractionTimeMs() !== null && extractionTimeMs() !== undefined
          "
        >
          {{ formatSeconds(extractionTimeMs()!) }}
        </span>
      </div>

      <ng-container *ngIf="extraction(); else emptyState">
        <div class="profile-summary">
          <div class="profile-row">
            <span class="label">Age</span>
            <strong>{{ displayValue(extraction()?.age) }}</strong>
          </div>
          <div class="profile-row">
            <span class="label">Gender</span>
            <strong>{{ displayValue(extraction()?.gender) }}</strong>
          </div>
          <div class="profile-row">
            <span class="label">Height</span>
            <strong>{{
              displayValue(extraction()?.height, 'Not provided', 'cm')
            }}</strong>
          </div>
          <div class="profile-row">
            <span class="label">Weight</span>
            <strong>{{
              displayValue(extraction()?.weight, 'Not provided', 'kg')
            }}</strong>
          </div>
        </div>

        <section class="info-section">
          <div class="section-title">Symptoms</div>
          <div
            class="symptom-list"
            *ngIf="extraction()?.symptoms?.length; else noSymptoms"
          >
            <article
              class="data-card"
              *ngFor="let symptom of extraction()?.symptoms ?? []"
            >
              <div class="card-head">
                <h4>{{ displayValue(symptom?.name, 'Not provided') }}</h4>
              </div>
              <div class="detail-row">
                <span>Duration</span
                ><strong>{{ displayValue(symptom?.duration) }}</strong>
              </div>
              <div class="detail-row">
                <span>Intensity</span
                ><strong>{{ displayValue(symptom?.intensity) }}</strong>
              </div>
              <div class="detail-row">
                <span>Aggravating factors</span>
                <strong>{{
                  symptom?.aggravating_factors?.length
                    ? symptom.aggravating_factors.join(', ')
                    : 'Not provided'
                }}</strong>
              </div>
            </article>
          </div>
          <ng-template #noSymptoms>
            <div class="empty-inline">None reported</div>
          </ng-template>
        </section>

        <section class="info-section">
          <div class="section-title">Medications</div>
          <ul class="list-stack">
            <li *ngFor="let item of extraction()?.medications ?? []">
              {{ item }}
            </li>
            <li class="empty-inline" *ngIf="!extraction()?.medications?.length">
              None reported
            </li>
          </ul>
        </section>

        <section class="info-section warning">
          <div class="section-title">Allergies</div>
          <ul class="list-stack">
            <li *ngFor="let item of extraction()?.allergies ?? []">
              {{ item }}
            </li>
            <li class="empty-inline" *ngIf="!extraction()?.allergies?.length">
              None reported
            </li>
          </ul>
        </section>

        <section class="info-section">
          <div class="section-title">Medical history</div>
          <ul class="list-stack">
            <li *ngFor="let item of extraction()?.medical_history ?? []">
              {{ item }}
            </li>
            <li
              class="empty-inline"
              *ngIf="!extraction()?.medical_history?.length"
            >
              None reported
            </li>
          </ul>
        </section>

        <section class="info-section">
          <div class="section-title">Other details</div>
          <p class="text-block">
            {{ displayValue(extraction()?.other_details, 'Not provided') }}
          </p>
        </section>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-icon">+</div>
          <p>No patient information extracted yet.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .panel {
        padding: 1.25rem;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg-surface);
        overflow-y: auto;
        max-height: 100%;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      h3 {
        margin: 0;
        font-size: 1rem;
        color: var(--color-primary);
      }

      .response-time {
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.2);
        color: #1d4ed8;
        border-radius: 999px;
        padding: 0.3rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
      }

      .profile-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
        margin-bottom: 1rem;
      }

      .profile-row,
      .data-card {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      }

      .profile-row {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.75rem 0.8rem;
      }

      .label,
      .detail-row span {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-muted);
      }

      .profile-row strong,
      .detail-row strong {
        font-size: 0.88rem;
        color: var(--color-text-primary);
        line-height: 1.4;
      }

      .info-section {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .section-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--color-primary);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .symptom-list,
      .list-stack {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .data-card {
        padding: 0.8rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .card-head h4 {
        margin: 0;
        font-size: 0.9rem;
        color: var(--color-text-primary);
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .detail-row strong {
        text-align: right;
        font-weight: 600;
      }

      .list-stack {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0.75rem;
      }

      .list-stack li {
        padding: 0.2rem 0;
        color: var(--color-text-primary);
        list-style: none;
      }

      .warning {
        border-radius: var(--radius-md);
      }

      .warning .section-title {
        color: #b45309;
      }

      .empty-inline,
      .text-block,
      .empty-state p {
        color: var(--color-text-muted);
        font-size: 0.82rem;
        line-height: 1.5;
        margin: 0;
      }

      .text-block {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0.8rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 180px;
        text-align: center;
        background: rgba(148, 163, 184, 0.06);
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-lg);
        color: var(--color-text-muted);
        gap: 0.5rem;
      }

      .empty-icon {
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.07);
        color: var(--color-primary);
        font-size: 1.35rem;
        font-weight: 600;
      }
    `,
  ],
})
export class PatientContextPanelComponent {
  private conversationService = inject(ConversationService);

  extraction = this.conversationService.extractionResult;
  extractionTimeMs = this.conversationService.extractionTimeMs;

  displayValue(
    value: string | number | null | undefined,
    placeholder = 'Not provided',
    suffix = '',
  ): string {
    if (value === null || value === undefined || value === '') {
      return placeholder;
    }

    const stringValue = String(value);
    return suffix ? `${stringValue} ${suffix}` : stringValue;
  }

  formatSeconds(milliseconds: number): string {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}
