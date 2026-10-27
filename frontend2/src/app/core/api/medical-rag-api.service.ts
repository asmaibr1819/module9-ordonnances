import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SSEEvent, TokenEventData, SourcesEventData, SSEEventName } from '../models/sse-event.model';
import { Module1Output } from '../models/module1-output.model';

@Injectable({
  providedIn: 'root'
})
export class MedicalRAGApiService {
  private readonly streamUrl = `${environment.apiUrl}${environment.apiEndpoints.ragStream}`;

  /**
   * Streams a RAG response from the FastAPI backend.
   * Since it uses POST, we use fetch() with a ReadableStream.
   */
  async streamRAGResponse(
    query: Module1Output, 
    onEvent: (event: SSEEvent) => void, 
    onDone: () => void, 
    onError: (err: Error) => void, 
    signal: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(this.streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        signal: signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('Response body is null');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          this.parseSSEEvent(part, onEvent);
        }
      }
      onDone();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
      } else {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private parseSSEEvent(part: string, onEvent: (event: SSEEvent) => void) {
    const lines = part.split('\n');
    let eventName = 'message';
    let data = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('event:')) {
        eventName = trimmedLine.replace('event:', '').trim() as any;
      } else if (trimmedLine.startsWith('data:')) {
        data += trimmedLine.replace('data:', '').trim();
      }
    }

    try {
      const parsedData = data ? JSON.parse(data) : null;
      onEvent({ event: eventName as SSEEventName, data: parsedData });
    } catch (e) {
      console.error('Error parsing SSE data', e, data);
    }
  }
}
