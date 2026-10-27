import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { EngineChoice, PrescriptionSheet } from '../../models/prescription.models';
import { PrescriptionApiService } from '../../services/prescription-api.service';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-prescription-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './prescription-page.component.html',
  styleUrl: './prescription-page.component.scss',
})
export class PrescriptionPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(PrescriptionApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<'photo' | 'texte'>('photo');
  readonly engine = signal<EngineChoice>('');
  readonly file = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly text = signal('');
  readonly loading = signal(false);
  readonly step = signal('');
  readonly error = signal<string | null>(null);
  readonly sheet = signal<PrescriptionSheet | null>(null);
  readonly apiOnline = signal<boolean | null>(null);

  readonly apiLabel = computed(() => {
    const online = this.apiOnline();
    if (online === null) return "Connexion à l'API";
    return online ? 'API connectée' : 'API hors ligne';
  });
  readonly canScan = computed(() => !!this.file() && !this.loading());
  readonly canAnalyze = computed(() => this.text().trim().length >= 3 && !this.loading());

  ngOnInit(): void {
    if (this.isBrowser) this.checkApi();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  checkApi(): void {
    if (!this.isBrowser) return;
    this.apiOnline.set(null);
    this.api.health().subscribe({
      next: () => this.apiOnline.set(true),
      error: () => this.apiOnline.set(false),
    });
  }

  setMode(mode: 'photo' | 'texte'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  setEngine(event: Event): void {
    this.engine.set((event.target as HTMLSelectElement).value as EngineChoice);
  }

  onText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = input.files?.[0] ?? null;
    this.error.set(null);
    this.revokePreview();
    if (!picked) {
      this.file.set(null);
      return;
    }
    if (!ACCEPTED.includes(picked.type)) {
      this.file.set(null);
      this.error.set('Format non supporté : utilise une image JPG, PNG ou WEBP.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      this.file.set(null);
      this.error.set('Image trop lourde (8 Mo maximum).');
      return;
    }
    this.file.set(picked);
    this.previewUrl.set(URL.createObjectURL(picked));
  }

  /** Photo -> texte lu -> fiche. */
  scan(): void {
    const picked = this.file();
    if (!picked || this.loading()) return;
    this.begin('Lecture de l’image…');
    this.api
      .readImage(picked, this.engine())
      .pipe(
        switchMap((ocr) => {
          this.text.set(ocr.texte);
          if (ocr.texte.trim().length < 3) {
            throw new Error('EMPTY');
          }
          this.step.set('Analyse du texte…');
          return this.api.analyzeText(ocr.texte);
        }),
        finalize(() => this.end()),
      )
      .subscribe({
        next: (sheet) => this.sheet.set(sheet),
        error: (err) => this.fail(err),
      });
  }

  /** Texte saisi (ou corrigé) -> fiche. */
  analyze(): void {
    if (!this.canAnalyze()) return;
    this.begin('Analyse du texte…');
    this.api
      .analyzeText(this.text().trim())
      .pipe(finalize(() => this.end()))
      .subscribe({
        next: (sheet) => this.sheet.set(sheet),
        error: (err) => this.fail(err),
      });
  }

  private begin(step: string): void {
    this.loading.set(true);
    this.step.set(step);
    this.error.set(null);
    this.sheet.set(null);
  }

  private end(): void {
    this.loading.set(false);
    this.step.set('');
  }

  private fail(err: unknown): void {
    if (err instanceof Error && err.message === 'EMPTY') {
      this.error.set(
        'Aucun texte lisible sur l’image. Essaie une photo plus nette ou un autre moteur de lecture.',
      );
      return;
    }
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        this.error.set(
          'L’API du Module 9 ne répond pas. Vérifie qu’elle tourne sur http://127.0.0.1:8002.',
        );
        this.apiOnline.set(false);
        return;
      }
      const detail = err.error?.detail;
      this.error.set(
        typeof detail === 'string'
          ? detail
          : 'Données invalides : vérifie l’image ou le texte (3 caractères minimum).',
      );
      return;
    }
    this.error.set('Une erreur inattendue est survenue.');
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }
}
