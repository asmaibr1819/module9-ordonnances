import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly healthUrl = `${environment.apiUrl}${environment.apiEndpoints.health}`;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<{ status: string; details?: any }> {
    return this.http.get<{ status: string; details?: any }>(this.healthUrl);
  }
}
