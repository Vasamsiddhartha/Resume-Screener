/**
 * ATS Worker Client - Type-safe wrapper for the ATS Worker
 *
 * This provides a clean, type-safe API for the main thread to interact with the worker.
 * Handles worker lifecycle, communication, and event handling.
 */

import { wrap, type Remote } from 'comlink';
import type { ATSWorkerAPI } from './ats-worker';
import type {
    ATSAnalysisResult,
    ATSEngineConfig,
    ATSEventType,
    EventCallback,
    ModelInfo,
    PerformanceMetrics
} from '../types';

/**
 * Worker event types that can be received from the worker
 */
interface WorkerEvent {
    type: 'statusUpdate' | 'error' | 'ready' | 'analysisStarted' | 'analysisComplete' | 'disposed';
    message?: string;
    error?: string;
    modelInfo?: ModelInfo;
    initTime?: number;
    result?: ATSAnalysisResult;
}

/**
 * Client wrapper for the ATS Worker
 * Provides type-safe communication and event handling
 */
export class ATSWorkerClient {
    private worker: Worker | null = null;
    private workerAPI: Remote<ATSWorkerAPI> | null = null;
    private eventCallbacks: Map<ATSEventType, Set<EventCallback>> = new Map();
    private isInitialized: boolean = false;

    /**
     * Create a new worker client
     */
    constructor() {
        // Initialize event callback sets
        this.eventCallbacks.set('statusUpdate', new Set());
        this.eventCallbacks.set('error', new Set());
        this.eventCallbacks.set('ready', new Set());
        this.eventCallbacks.set('analysisComplete', new Set());
    }

    /**
     * Initialize the worker and load the ATSEngine
     */
    async initialize(config: ATSEngineConfig): Promise<{
        success: boolean;
        modelInfo: ModelInfo | null;
        initTime: number;
    }> {
        try {
            // Create the worker
            this.worker = new Worker(
                new URL('./ats-worker.ts', import.meta.url),
                { type: 'module' }
            );

            // Set up message listener for worker events
            this.worker.addEventListener('message', (event: MessageEvent<WorkerEvent>) => {
                this.handleWorkerMessage(event.data);
            });

            // Wrap the worker with Comlink for type-safe RPC
            this.workerAPI = wrap<ATSWorkerAPI>(this.worker);

            // Initialize the engine in the worker
            const result = await this.workerAPI.initialize(config);

            this.isInitialized = result.success;

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('error', errorMessage);

            return {
                success: false,
                modelInfo: null,
                initTime: 0
            };
        }
    }

    /**
     * Score a resume against a job description
     */
    async score(
        resumeInput: File | string,
        jobInput: File | string,
        options?: Record<string, unknown>
    ): Promise<ATSAnalysisResult> {
        if (!this.workerAPI) {
            throw new Error('Worker not initialized. Call initialize() first.');
        }

        return await this.workerAPI.score(resumeInput, jobInput, options);
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(): Promise<PerformanceMetrics> {
        if (!this.workerAPI) {
            return {
                initTime: 0,
                totalAnalyses: 0,
                averageProcessingTime: 0,
                errors: 0
            };
        }

        return await this.workerAPI.getPerformanceMetrics();
    }

    /**
     * Get model information
     */
    async getModelInfo(): Promise<ModelInfo | null> {
        if (!this.workerAPI) {
            return null;
        }

        return await this.workerAPI.getModelInfo();
    }

    /**
     * Check if worker is ready
     */
    async isReady(): Promise<boolean> {
        if (!this.workerAPI) {
            return false;
        }

        return await this.workerAPI.isReady();
    }

    /**
     * Register an event callback
     */
    on(event: ATSEventType, callback: EventCallback): void {
        const callbacks = this.eventCallbacks.get(event);
        if (callbacks) {
            callbacks.add(callback);
        }
    }

    /**
     * Unregister an event callback
     */
    off(event: ATSEventType, callback: EventCallback): void {
        const callbacks = this.eventCallbacks.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Emit an event to all registered callbacks
     */
    private emit(event: ATSEventType, data?: unknown): void {
        const callbacks = this.eventCallbacks.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.warn(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Handle messages from the worker
     */
    private handleWorkerMessage(event: WorkerEvent): void {
        switch (event.type) {
            case 'statusUpdate':
                if (event.message) {
                    this.emit('statusUpdate', event.message);
                }
                break;

            case 'error':
                if (event.error) {
                    this.emit('error', event.error);
                }
                break;

            case 'ready':
                if (event.modelInfo && event.initTime !== undefined) {
                    this.emit('ready', {
                        modelInfo: event.modelInfo,
                        initTime: event.initTime,
                        features: {
                            semanticSimilarity: true,
                            basicRecommendations: true,
                            privacyMode: true
                        }
                    });
                }
                break;

            case 'analysisStarted':
                this.emit('statusUpdate', 'Analysis started...');
                break;

            case 'analysisComplete':
                if (event.result) {
                    this.emit('analysisComplete', event.result);
                }
                break;

            case 'disposed':
                this.isInitialized = false;
                break;

            default:
                // Ignore unknown event types to prevent console warnings from internal Comlink/Transformers.js messages
                // console.warn('Unknown worker event type:', event);
                break;
        }
    }

    /**
     * Clean up and terminate the worker
     */
    dispose(): void {
        if (this.workerAPI) {
            // Call dispose on the worker
            this.workerAPI.dispose().catch(err => {
                console.warn('Error disposing worker:', err);
            });
        }

        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        this.workerAPI = null;
        this.isInitialized = false;

        // Clear all event callbacks
        this.eventCallbacks.forEach(callbacks => callbacks.clear());
    }

    /**
     * Check if the client is initialized
     */
    get ready(): boolean {
        return this.isInitialized;
    }
}
