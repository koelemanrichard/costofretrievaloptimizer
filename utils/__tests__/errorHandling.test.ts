import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { handleOperationError } from '../errorHandling';
import type { AppAction } from '../../state/appState';

describe('handleOperationError', () => {
    let dispatch: React.Dispatch<AppAction> & Mock;

    beforeEach(() => {
        dispatch = vi.fn() as React.Dispatch<AppAction> & Mock;
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('extracts message from Error instance', () => {
        const result = handleOperationError(
            new Error('Something broke'),
            dispatch,
            'TestContext'
        );

        expect(result).toBe('Something broke');
    });

    it('converts non-Error to string', () => {
        const result = handleOperationError(
            'raw string error',
            dispatch,
            'TestContext'
        );

        expect(result).toBe('raw string error');
    });

    it('dispatches LOG_EVENT with failure status', () => {
        handleOperationError(new Error('fail'), dispatch, 'MyService');

        const logAction = dispatch.mock.calls.find(
            (call: [AppAction]) => call[0].type === 'LOG_EVENT'
        );
        expect(logAction).toBeDefined();
        expect(logAction![0].payload).toMatchObject({
            service: 'MyService',
            message: 'fail',
            status: 'failure',
        });
    });

    it('dispatches SET_ERROR by default', () => {
        handleOperationError(new Error('visible'), dispatch, 'Ctx');

        const errorAction = dispatch.mock.calls.find(
            (call: [AppAction]) => call[0].type === 'SET_ERROR'
        );
        expect(errorAction).toBeDefined();
        expect(errorAction![0].payload).toBe('[Ctx] visible');
    });

    it('does NOT dispatch SET_ERROR when silent: true', () => {
        handleOperationError(new Error('hidden'), dispatch, 'Ctx', { silent: true });

        const errorAction = dispatch.mock.calls.find(
            (call: [AppAction]) => call[0].type === 'SET_ERROR'
        );
        expect(errorAction).toBeUndefined();
    });

    it('always logs to console.error', () => {
        handleOperationError(new Error('logged'), dispatch, 'Ctx', { silent: true });

        expect(console.error).toHaveBeenCalled();
    });
});
