import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OrderIn, ValidationOut } from '../models/pharmacist.models';

@Injectable({ providedIn: 'root' })
export class PharmacistApiService {
  private readonly http = inject(HttpClient);

  // Adresse de ton API FastAPI (uvicorn app.main:app --reload)
  private readonly baseUrl = 'http://127.0.0.1:8000';

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`);
  }

  validateOrder(order: OrderIn): Observable<ValidationOut> {
    return this.http.post<ValidationOut>(`${this.baseUrl}/validate-order`, order);
  }
}
