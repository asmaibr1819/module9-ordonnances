import { Component, signal, computed, Injectable } from '@angular/core';
import { Conversation, Message } from '../models/conversation.model';
import { MedicalRAGApiService } from '../api/medical-rag-api.service';
import { Module1Output } from '../models/module1-output.model';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private _conversations = signal<Conversation[]>(this.loadFromStorage());
  private _activeConversationId = signal<string | null>(null);
  private _isStreaming = signal<boolean>(false);
  private currentAbortController = signal<AbortController | null>(null);

  conversations = this._conversations.asReadonly();
  activeConversationId = this._activeConversationId.asReadonly();
  isStreaming = this._isStreaming.asReadonly();

  activeConversation = computed(() =>
    this._conversations().find((c) => c.id === this._activeConversationId()),
  );

  messages = computed(() => {
    const active = this.activeConversation();
    return active ? active.messages : [];
  });

  extractionResult = computed(
    () => this.activeConversation()?.extraction ?? null,
  );
  extractionTimeMs = computed(
    () => this.activeConversation()?.extractionTimeMs ?? null,
  );

  constructor(private ragApi: MedicalRAGApiService) {}

  ensureConversation(): string {
    let convId = this._activeConversationId();
    if (!convId) {
      convId = this.createConversation('New Conversation').id;
    }
    return convId;
  }

  createConversation(title: string = 'New Conversation') {
    const id = crypto.randomUUID();
    const newConv: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      extraction: null,
      extractionTimeMs: null,
    };
    this._conversations.update((prev) => [...prev, newConv]);
    this._activeConversationId.set(id);
    this.saveToStorage();
    return newConv;
  }

  setActiveConversation(id: string) {
    this._activeConversationId.set(id);
  }

  appendMessage(convId: string, message: Message) {
    this.updateMessages(convId, [message]);
  }

  setExtractionResult(
    convId: string,
    extraction: Module1Output | null,
    elapsedMs: number | null = null,
  ) {
    this._conversations.update((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          extraction,
          extractionTimeMs: elapsedMs,
          updatedAt: new Date(),
        };
      }),
    );
    this.saveToStorage();
  }

  updateAssistantMessage(
    convId: string,
    msgId: string,
    content: string,
    status: 'loading' | 'complete' | 'error' = 'complete',
  ) {
    this._conversations.update((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId ? { ...m, content, status } : m,
          ),
        };
      }),
    );
    this.saveToStorage();
  }

  async sendMessage(query: Module1Output) {
    let convId = this._activeConversationId();

    if (!convId) {
      convId = this.createConversation('New Conversation').id;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.symptoms[0]?.name || 'Symptom description',
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'loading',
    };

    this.updateMessages(convId, [userMsg, assistantMsg]);

    const controller = new AbortController();
    this.currentAbortController.set(controller);
    this._isStreaming.set(true);

    try {
      await this.ragApi.streamRAGResponse(
        query,
        (event) => this.handleSSEEvent(convId, assistantMsg.id, event),
        () => this.handleStreamDone(convId, assistantMsg.id),
        (err) => this.handleStreamError(convId, assistantMsg.id, err),
        controller.signal,
      );
    } finally {
      this.currentAbortController.set(null);
      this._isStreaming.set(false);
    }
  }

  cancelStreaming() {
    this.currentAbortController()?.abort();
  }

  private handleSSEEvent(convId: string, msgId: string, event: any) {
    if (event.event === 'token') {
      const data = event.data;
      this.updateAssistantMessageContent(convId, msgId, data.text);
    } else if (event.event === 'sources') {
      const data = event.data;
      this.updateAssistantMessageSources(convId, msgId, data.sources);
    }
  }

  private handleStreamDone(convId: string, msgId: string) {
    this.updateAssistantMessageStatus(convId, msgId, 'complete');
  }

  private handleStreamError(convId: string, msgId: string, error: Error) {
    this.updateAssistantMessageStatus(convId, msgId, 'error');
  }

  private updateMessages(convId: string, newMessages: Message[]) {
    this._conversations.update((convs) =>
      convs.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, ...newMessages],
              updatedAt: new Date(),
            }
          : c,
      ),
    );
    this.saveToStorage();
  }

  private updateAssistantMessageContent(
    convId: string,
    msgId: string,
    text: string,
  ) {
    this._conversations.update((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId ? { ...m, content: m.content + text } : m,
          ),
        };
      }),
    );
  }

  private updateAssistantMessageSources(
    convId: string,
    msgId: string,
    sources: any[],
  ) {
    this._conversations.update((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId ? { ...m, sources: sources } : m,
          ),
        };
      }),
    );
  }

  private updateAssistantMessageStatus(
    convId: string,
    msgId: string,
    status: 'complete' | 'error',
  ) {
    this._conversations.update((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId ? { ...m, status: status } : m,
          ),
        };
      }),
    );
  }

  private saveToStorage() {
    localStorage.setItem(
      'medrag_conversations',
      JSON.stringify(this._conversations()),
    );
  }

  private loadFromStorage(): Conversation[] {
    const stored = localStorage.getItem('medrag_conversations');
    return stored ? JSON.parse(stored) : [];
  }
}
