import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  EngineChoice,
  OcrResponse,
  PrescriptionSheet,
} from '../models/prescription.models';

@Injectable({ providedIn: 'root' })
export class PrescriptionApiService {
  private readonly http = inject(HttpClient);

  // API du Module 9 : uvicorn app.main:app --port 8002
  // (8001 = Modules 1 et 2, 8000 = Module 8)
  private readonly baseUrl = 'http://127.0.0.1:8002';

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/api/health`);
  }

  /** Étape 1 : image -> texte lu. */
  readImage(file: File, engine: EngineChoice): Observable<OcrResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    const query = engine ? `?engine=${engine}` : '';
    return this.http.post<OcrResponse>(`${this.baseUrl}/api/ocr${query}`, form);
  }

  /** Étape 2 : texte -> fiche médicament. */
  analyzeText(texte: string): Observable<PrescriptionSheet> {
    return this.http.post<PrescriptionSheet>(`${this.baseUrl}/api/analyze`, { texte });
  }
}
