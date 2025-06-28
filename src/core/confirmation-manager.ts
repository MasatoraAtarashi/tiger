import { EventEmitter } from 'events';

export interface ConfirmationRequest {
  id: string;
  tool: string;
  message: string;
  details?: string;
  params: Record<string, unknown>;
}

export class ConfirmationManager extends EventEmitter {
  private pendingConfirmation: ConfirmationRequest | null = null;
  private confirmCallback: ((approved: boolean) => void) | null = null;

  async requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingConfirmation = request;
      this.confirmCallback = resolve;
      this.emit('confirmationRequired', request);
    });
  }

  respond(approved: boolean): void {
    if (this.confirmCallback) {
      this.confirmCallback(approved);
      this.pendingConfirmation = null;
      this.confirmCallback = null;
      this.emit('confirmationComplete');
    }
  }

  getPendingConfirmation(): ConfirmationRequest | null {
    return this.pendingConfirmation;
  }

  hasPendingConfirmation(): boolean {
    return this.pendingConfirmation !== null;
  }
}

export const confirmationManager = new ConfirmationManager();