import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationGuard } from '../useOperationGuard';
import type { AppAction } from '../../state/appState';

describe('useOperationGuard', () => {
    let dispatch: React.Dispatch<AppAction> & Mock;

    beforeEach(() => {
        dispatch = vi.fn() as React.Dispatch<AppAction> & Mock;
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('runs the provided function and returns its result', async () => {
        const { result } = renderHook(() =>
            useOperationGuard({ loadingKey: 'test', dispatch, operationName: 'Test Op' })
        );

        let value: string | undefined;
        await act(async () => {
            value = await result.current.run(async () => 'hello');
        });

        expect(value).toBe('hello');
    });

    it('dispatches SET_LOADING on entry and exit', async () => {
        const { result } = renderHook(() =>
            useOperationGuard({ loadingKey: 'myKey', dispatch, operationName: 'Test Op' })
        );

        await act(async () => {
            await result.current.run(async () => 42);
        });

        const loadingCalls = dispatch.mock.calls.filter(
            (call: [AppAction]) => call[0].type === 'SET_LOADING'
        );
        expect(loadingCalls.length).toBe(2);
        expect(loadingCalls[0][0].payload).toMatchObject({ key: 'myKey', value: true, context: 'Test Op' });
        expect(loadingCalls[1][0].payload).toMatchObject({ key: 'myKey', value: false });
    });

    it('prevents re-entrance and dispatches warning notification', async () => {
        const { result } = renderHook(() =>
            useOperationGuard({ loadingKey: 'test', dispatch, operationName: 'Slow Op' })
        );

        // Start a slow operation
        let resolveFirst: () => void;
        const firstPromise = new Promise<void>(r => { resolveFirst = r; });

        let secondResult: number | undefined;
        await act(async () => {
            // Launch first (don't await yet)
            const p1 = result.current.run(async () => {
                await firstPromise;
                return 1;
            });

            // Try to run again while first is in progress
            secondResult = await result.current.run(async () => 2);

            // Now resolve the first
            resolveFirst!();
            await p1;
        });

        // Second call should have been guarded
        expect(secondResult).toBeUndefined();

        // Should have dispatched a warning notification
        const notifCall = dispatch.mock.calls.find(
            (call: [AppAction]) => call[0].type === 'SET_NOTIFICATION'
        );
        expect(notifCall).toBeDefined();
        expect(notifCall![0].payload).toMatchObject({
            message: 'Slow Op already in progress.',
            severity: 'warning',
        });
    });

    it('catches errors and dispatches SET_ERROR', async () => {
        const { result } = renderHook(() =>
            useOperationGuard({ loadingKey: 'err', dispatch, operationName: 'Failing Op' })
        );

        let value: string | undefined;
        await act(async () => {
            value = await result.current.run(async () => {
                throw new Error('boom');
            });
        });

        expect(value).toBeUndefined();

        const errorCall = dispatch.mock.calls.find(
            (call: [AppAction]) => call[0].type === 'SET_ERROR'
        );
        expect(errorCall).toBeDefined();
    });

    it('clears the guard after an error so subsequent calls work', async () => {
        const { result } = renderHook(() =>
            useOperationGuard({ loadingKey: 'retry', dispatch, operationName: 'Retry Op' })
        );

        // First call errors
        await act(async () => {
            await result.current.run(async () => { throw new Error('fail'); });
        });

        // Second call should succeed
        let value: number | undefined;
        await act(async () => {
            value = await result.current.run(async () => 42);
        });

        expect(value).toBe(42);
    });
});
