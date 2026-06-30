import type { ATSError, ATSErrorType } from '../types';

/**
 * Custom error class for ATS-specific errors
 * Following proper error handling patterns
 */
export class ATSEngineError extends Error implements ATSError {
    public readonly type: ATSErrorType;
    public readonly code?: string;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: string;

    constructor(
        message: string,
        type: ATSErrorType,
        code?: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ATSEngineError';
        this.type = type;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}
