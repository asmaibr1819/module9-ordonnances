import { Component, input, model } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

// Champ "etiquettes" : on tape un mot, Entree (ou virgule) l'ajoute, la croix le retire.
@Component({
  selector: 'app-chip-input',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="box" (click)="field.focus()">
      @for (value of values(); track value; let i = $index) {
        <span class="chip">
          {{ value }}
          <button type="button" class="remove" (click)="remove(i); $event.stopPropagation()"
                  [attr.aria-label]="'Retirer ' + value">
            <app-icon name="x" [size]="12" />
          </button>
        </span>
      }
      <input
        #field
        class="field"
        [id]="inputId()"
        [value]="draft"
        [placeholder]="values().length ? '' : placeholder()"
        (input)="draft = field.value"
        (keydown)="onKey($event)"
        (blur)="add()"
        autocomplete="off"
      />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .box { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 40px; padding: 5px 8px;
           background: #fff; border: 1px solid var(--ph-border-strong, #c5d2db); border-radius: 10px; cursor: text; }
    .box:focus-within { border-color: var(--ph-primary, #155e75); box-shadow: 0 0 0 3px var(--ph-focus, #cfe8ef); }
    .chip { display: inline-flex; align-items: center; gap: 4px; background: var(--ph-primary-soft, #e6f4f8);
            color: var(--ph-primary, #155e75); border-radius: 999px; padding: 3px 4px 3px 10px; font-size: 0.82rem;
            font-weight: 600; }
    .remove { display: inline-flex; border: 0; background: transparent; color: inherit; cursor: pointer;
              border-radius: 50%; padding: 3px; }
    .remove:hover { background: rgba(21, 94, 117, 0.15); }
    .remove:focus-visible { outline: 2px solid var(--ph-primary, #155e75); }
    .field { flex: 1; min-width: 90px; border: 0; outline: 0; background: transparent; padding: 4px 2px;
             font: inherit; font-size: 0.9rem; color: inherit; }
  `],
})
export class ChipInputComponent {
  values = model<string[]>([]);
  placeholder = input('Écrire, puis Entrée');
  inputId = input('');
  draft = '';

  add(): void {
    const value = this.draft.trim();
    if (value && !this.values().some((v) => v.toLowerCase() === value.toLowerCase())) {
      this.values.set([...this.values(), value]);
    }
    this.draft = '';
  }

  remove(index: number): void {
    this.values.set(this.values().filter((_, i) => i !== index));
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault(); // evite d'envoyer le formulaire en appuyant sur Entree
      this.add();
    } else if (event.key === 'Backspace' && !this.draft && this.values().length) {
      this.values.set(this.values().slice(0, -1));
    }
  }
}
