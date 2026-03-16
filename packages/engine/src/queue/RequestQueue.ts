import PQueue from 'p-queue';
import type { Result } from '../types/result.js';
import type { ProviderError, ProviderId } from '../types/errors.js';
import { ok, err } from '../types/result.js';
import { calculateBackoff } from './backoff.js';

export interface QueueConfig {
  readonly providerId: ProviderId;
  readonly requestsPerSecond: number;
  readonly maxRetries?: number;       // default: 3
  readonly maxDelayMs?: number;       // default: 30_000
  readonly circuitBreakerThreshold?: number; // default: 5
  readonly circuitBreakerDurationMs?: number; // default: 60_000
}

export interface QueueStatus {
  readonly pending: number;
  readonly size: number;
  readonly isPaused: boolean;
  readonly lastError: ProviderError | null;
  readonly isCircuitOpen: boolean;
  readonly consecutiveFailures: number;
}

export type QueueEventType = 'error' | 'recovery' | 'rateLimitHit' | 'circuitOpen' | 'circuitClose';
export type QueueEventListener = (event: { type: QueueEventType; providerId: ProviderId; error?: ProviderError }) => void;

export class RequestQueue {
  private readonly queue: PQueue;
  private readonly config: Required<QueueConfig>;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private lastError: ProviderError | null = null;
  private readonly listeners: QueueEventListener[] = [];
  private readonly getNow: () => number;

  constructor(config: QueueConfig, getNow: () => number = Date.now) {
    this.config = {
      providerId: config.providerId,
      requestsPerSecond: config.requestsPerSecond,
      maxRetries: config.maxRetries ?? 3,
      maxDelayMs: config.maxDelayMs ?? 30_000,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerDurationMs: config.circuitBreakerDurationMs ?? 60_000,
    };
    this.getNow = getNow;

    const interval = Math.floor(1000 / this.config.requestsPerSecond);
    this.queue = new PQueue({
      concurrency: 1,
      intervalCap: 1,
      interval,
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<Result<T, ProviderError>> {
    if (this.isCircuitOpen()) {
      const error: ProviderError = {
        kind: 'CircuitOpenError',
        provider: this.config.providerId,
        reopensAt: this.circuitOpenUntil,
      };
      return err(error);
    }

    const result = await this.queue.add(() => this.withRetry(fn));
    // p-queue.add can return undefined if the task was filtered, but we always return a Result
    return result as Result<T, ProviderError>;
  }

  getStatus(): QueueStatus {
    return {
      pending: this.queue.pending,
      size: this.queue.size,
      isPaused: this.queue.isPaused,
      lastError: this.lastError,
      isCircuitOpen: this.isCircuitOpen(),
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  on(listener: QueueEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
    this.lastError = null;
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) return false;
    if (this.getNow() >= this.circuitOpenUntil) {
      this.circuitOpenUntil = 0;
      this.consecutiveFailures = 0;
      this.emit({ type: 'circuitClose', providerId: this.config.providerId });
      return false;
    }
    return true;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<Result<T, ProviderError>> {
    try {
      const value = await fn();
      this.onSuccess();
      return ok(value);
    } catch (e: unknown) {
      const providerError = this.toProviderError(e);
      // TypeError = browser-blocked request (CORS, mixed content) — retrying will never succeed
      const isRetryable = !(e instanceof TypeError) &&
        (providerError.kind === 'RateLimitError' || providerError.kind === 'NetworkError');

      if (isRetryable && attempt < this.config.maxRetries) {
        if (providerError.kind === 'RateLimitError') {
          this.emit({ type: 'rateLimitHit', providerId: this.config.providerId, error: providerError });
        }
        const delay = calculateBackoff(attempt, { maxDelayMs: this.config.maxDelayMs });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, attempt + 1);
      }

      this.onFailure(providerError);
      return err(providerError);
    }
  }

  private onSuccess(): void {
    if (this.consecutiveFailures > 0) {
      this.emit({ type: 'recovery', providerId: this.config.providerId });
    }
    this.consecutiveFailures = 0;
    this.lastError = null;
  }

  private onFailure(error: ProviderError): void {
    this.consecutiveFailures++;
    this.lastError = error;
    this.emit({ type: 'error', providerId: this.config.providerId, error });

    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.circuitOpenUntil = this.getNow() + this.config.circuitBreakerDurationMs;
      this.emit({ type: 'circuitOpen', providerId: this.config.providerId, error });
    }
  }

  private toProviderError(e: unknown): ProviderError {
    if (typeof e === 'object' && e !== null && 'kind' in e) {
      return e as ProviderError;
    }
    return {
      kind: 'NetworkError',
      provider: this.config.providerId,
      message: e instanceof Error ? e.message : String(e),
      originalError: e,
    };
  }

  private emit(event: { type: QueueEventType; providerId: ProviderId; error?: ProviderError }): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
