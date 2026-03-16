import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../src/hooks/useDebounce.js';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the callback immediately on invocation', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 350));

    act(() => {
      result.current('test');
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('fires the callback after the delay period', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 350));

    act(() => {
      result.current('test');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('rapid successive calls only trigger callback once after last call + delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 350));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('third');
  });

  it('cleanup cancels pending timer on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 350));

    act(() => {
      result.current('test');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
