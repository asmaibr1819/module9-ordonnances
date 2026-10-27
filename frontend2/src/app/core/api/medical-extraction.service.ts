import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Module1Output } from '../models/module1-output.model';

@Injectable({
  providedIn: 'root',
})
export class MedicalExtractionService {
  private readonly extractUrl = `${environment.apiUrl}${environment.apiEndpoints.extract}`;

  constructor(private http: HttpClient) {}

  extractInformation(text: string): Observable<Module1Output> {
    return this.http
      .post<any>(this.extractUrl, { text })
      .pipe(map((response) => this.normalizeExtraction(response)));
  }

  private normalizeExtraction(response: any): Module1Output {
    const data = response?.result ?? response ?? {};

    return {
      age: data.age ?? null,
      height: data.height ?? null,
      weight: data.weight ?? null,
      gender: data.gender ?? null,
      symptoms: Array.isArray(data.symptoms)
        ? data.symptoms.map((symptom: any) => ({
            name: symptom?.name ?? null,
            duration: symptom?.duration ?? null,
            intensity: symptom?.intensity ?? null,
            aggravating_factors: Array.isArray(symptom?.aggravating_factors)
              ? symptom.aggravating_factors
                  .filter(
                    (value: unknown) => value !== null && value !== undefined,
                  )
                  .map((value: unknown) => String(value))
              : [],
          }))
        : [],
      medications: Array.isArray(data.medications)
        ? data.medications
            .filter((value: unknown) => value !== null && value !== undefined)
            .map((value: unknown) => String(value))
        : [],
      medical_history: Array.isArray(data.medical_history)
        ? data.medical_history
            .filter((value: unknown) => value !== null && value !== undefined)
            .map((value: unknown) => String(value))
        : [],
      allergies: Array.isArray(data.allergies)
        ? data.allergies
            .filter((value: unknown) => value !== null && value !== undefined)
            .map((value: unknown) => String(value))
        : [],
      other_details: data.other_details ?? null,
    };
  }
}
