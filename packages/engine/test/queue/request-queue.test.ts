import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestQueue } from '../../src/queue/RequestQueue.js';
import type { ProviderError } from '../../src/types/errors.js';

describe('RequestQueue', () => {
  let now: number;
  let queue: RequestQueue;

  beforeEach(() => {
    now = 1000;
    queue = new RequestQueue(
      {
        providerId: 'musicbrainz',
        requestsPerSecond: 1000, // fast for tests
        maxRetries: 3,
        maxDelayMs: 100,
        circuitBreakerThreshold: 3,
        circuitBreakerDurationMs: 5000,
      },
      () => now,
    );
  });

  it('executes a successful function and returns ok result', async () => {
    const result = await queue.execute(async () => 'hello');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('hello');
    }
  });

  it('returns err result on non-retryable error', async () => {
    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'test' };
    const result = await queue.execute(async () => { throw error; });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('NotFoundError');
    }
  });

  it('retries on RateLimitError up to maxRetries', async () => {
    let callCount = 0;
    const rateLimitError: ProviderError = { kind: 'RateLimitError', provider: 'musicbrainz' };
    const result = await queue.execute(async () => {
      callCount++;
      if (callCount < 3) throw rateLimitError;
      return 'success';
    });
    expect(callCount).toBe(3);
    expect(result.ok).toBe(true);
  });

  it('retries on NetworkError up to maxRetries', async () => {
    let callCount = 0;
    const networkError: ProviderError = { kind: 'NetworkError', provider: 'musicbrainz', message: 'timeout' };
    const result = await queue.execute(async () => {
      callCount++;
      if (callCount < 2) throw networkError;
      return 'success';
    });
    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
  });

  it('stops retrying after maxRetries and returns err', async () => {
    let callCount = 0;
    const networkError: ProviderError = { kind: 'NetworkError', provider: 'musicbrainz', message: 'down' };
    const result = await queue.execute(async () => {
      callCount++;
      throw networkError;
    });
    // 1 initial + 3 retries = 4 total calls
    expect(callCount).toBe(4);
    expect(result.ok).toBe(false);
  });

  it('opens circuit breaker after threshold consecutive failures', async () => {
    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };

    // Trigger 3 consecutive failures (circuitBreakerThreshold=3)
    for (let i = 0; i < 3; i++) {
      await queue.execute(async () => { throw error; });
    }

    const status = queue.getStatus();
    expect(status.isCircuitOpen).toBe(true);
    expect(status.consecutiveFailures).toBe(3);
  });

  it('rejects immediately when circuit is open', async () => {
    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };

    for (let i = 0; i < 3; i++) {
      await queue.execute(async () => { throw error; });
    }

    let called = false;
    const result = await queue.execute(async () => { called = true; return 'should not run'; });
    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('CircuitOpenError');
    }
  });

  it('closes circuit after duration expires', async () => {
    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };

    for (let i = 0; i < 3; i++) {
      await queue.execute(async () => { throw error; });
    }

    expect(queue.getStatus().isCircuitOpen).toBe(true);

    // Advance time past circuit breaker duration (5000ms)
    now += 6000;

    const result = await queue.execute(async () => 'recovered');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('recovered');
    }
  });

  it('emits events on error and circuit open', async () => {
    const events: string[] = [];
    queue.on((event) => { events.push(event.type); });

    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };
    for (let i = 0; i < 3; i++) {
      await queue.execute(async () => { throw error; });
    }

    expect(events).toContain('error');
    expect(events).toContain('circuitOpen');
  });

  it('emits recovery event when succeeding after failures', async () => {
    const events: string[] = [];
    queue.on((event) => { events.push(event.type); });

    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };
    await queue.execute(async () => { throw error; });
    await queue.execute(async () => 'ok');

    expect(events).toContain('recovery');
  });

  it('getStatus returns current queue state', () => {
    const status = queue.getStatus();
    expect(status.pending).toBe(0);
    expect(status.isCircuitOpen).toBe(false);
    expect(status.lastError).toBeNull();
    expect(status.consecutiveFailures).toBe(0);
  });

  it('reset() clears failure state', async () => {
    const error: ProviderError = { kind: 'NotFoundError', provider: 'musicbrainz', query: 'x' };
    for (let i = 0; i < 3; i++) {
      await queue.execute(async () => { throw error; });
    }
    expect(queue.getStatus().isCircuitOpen).toBe(true);

    queue.reset();

    expect(queue.getStatus().isCircuitOpen).toBe(false);
    expect(queue.getStatus().consecutiveFailures).toBe(0);
    expect(queue.getStatus().lastError).toBeNull();
  });
});
