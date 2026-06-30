/**
 * ATS Worker - Web Worker wrapper for ATSEngine
 *
 * This worker runs the heavy ML inference off the main thread to keep the UI responsive.
 * Uses Comlink for type-safe RPC communication.
 *
 * Architecture:
 * - Main Thread: UI, user interactions, progress updates
 * - Web Worker: Model loading, ONNX inference, heavy computation
 *
 * Benefits:
 * - Non-blocking UI during model loading (~2-5s)
 * - Non-blocking UI during inference (~0.5-2s per analysis)
 * - 3-4x faster CPU inference with multi-threading
 * - Better mobile performance
 */

console.log('[ATSWorker] Worker script started.'); // Added log

import { expose } from 'comlink';
import * as transformers from '@huggingface/transformers';
import type {
    ATSAnalysisResult,
    ATSEngineConfig,
    ModelInfo,
    PerformanceMetrics
} from '../types';
import { ATSEngine } from '../core/ats-engine';
import { getModelConfig } from '../config/model-config';

// Initialize transformers in worker context
// Workers don't have window object, so we create a global reference
(self as any).transformers = transformers;

// Get dynamic model configuration (local or remote)
const modelConfig = getModelConfig();

// Configure transformers environment for worker context - MATCH main thread config
console.log(`[ATSWorker] Configuring for ${modelConfig.source} models...`);
transformers.env.allowLocalModels = modelConfig.allowLocalModels;
transformers.env.allowRemoteModels = modelConfig.allowRemoteModels;
transformers.env.localModelPath = modelConfig.allowLocalModels ? './' : '';
transformers.env.remoteHost = modelConfig.remoteHost;
transformers.env.remotePathTemplate = modelConfig.remotePathTemplate;
// ENABLE caching in worker too
(transformers.env as any).useCache = true;

// Configure ONNX backend for better browser compatibility in worker
if (transformers.env.backends?.onnx?.wasm) {
    try {
        transformers.env.backends.onnx.wasm.numThreads = 1;
    } catch (error) {
        console.debug('Could not configure WASM threads in worker:', error);
    }
}

console.log(`[ATSWorker] Transformers configured (${modelConfig.source}):`, {
    source: modelConfig.source,
    allowLocalModels: transformers.env.allowLocalModels,
    allowRemoteModels: transformers.env.allowRemoteModels,
    remoteHost: transformers.env.remoteHost,
    remotePathTemplate: transformers.env.remotePathTemplate,
    semanticModel: modelConfig.paths.semanticModel,
    domainModel: modelConfig.paths.domainModel
});

/**
 * Worker API interface that will be exposed to the main thread
 * This ensures type safety across the worker boundary
 */
export interface ATSWorkerAPI {
    initialize(config: ATSEngineConfig): Promise<{
        success: boolean;
        modelInfo: ModelInfo | null;
        initTime: number;
    }>;

    score(
        resumeInput: File | string,
        jobInput: File | string,
        options?: Record<string, unknown>
    ): Promise<ATSAnalysisResult>;

    getPerformanceMetrics(): PerformanceMetrics;

    getModelInfo(): ModelInfo | null;

    isReady(): boolean;

    dispose(): void;
}

/**
 * Worker implementation
 */
class ATSWorker implements ATSWorkerAPI {
    private engine: ATSEngine | null = null;

    /**
     * Initialize the ATS Engine in the worker thread
     */
    async initialize(config: ATSEngineConfig): Promise<{
        success: boolean;
        modelInfo: ModelInfo | null;
        initTime: number;
    }> {
        const startTime = Date.now();

        try {
            // Create engine instance
            this.engine = new ATSEngine(config);

            // Set up status update listener to send to main thread
            this.engine.on('statusUpdate', (message: string) => {
                // Post status update to main thread
                self.postMessage({
                    type: 'statusUpdate',
                    message
                });
            });

            this.engine.on('error', (error: string) => {
                // Post error to main thread
                self.postMessage({
                    type: 'error',
                    error
                });
            });

            // Initialize the engine
            await this.engine.initialize();

            const initTime = Date.now() - startTime;
            const modelInfo = this.engine.getModelInfo();

            // Notify main thread that initialization is complete
            self.postMessage({
                type: 'ready',
                modelInfo,
                initTime
            });

            return {
                success: true,
                modelInfo,
                initTime
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Post error to main thread
            self.postMessage({
                type: 'error',
                error: errorMessage
            });

            return {
                success: false,
                modelInfo: null,
                initTime: Date.now() - startTime
            };
        }
    }

    /**
     * Score a resume against a job description
     * This is the heavy computation that benefits from running in a worker
     */
    async score(
        resumeInput: File | string,
        jobInput: File | string,
        _options?: Record<string, unknown>
    ): Promise<ATSAnalysisResult> {
        if (!this.engine) {
            throw new Error('Worker not initialized. Call initialize() first.');
        }

        // Notify main thread that analysis started
        self.postMessage({
            type: 'analysisStarted'
        });

        try {
            const result = await this.engine.score(resumeInput, jobInput);

            // Notify main thread that analysis completed
            self.postMessage({
                type: 'analysisComplete',
                result
            });

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            self.postMessage({
                type: 'error',
                error: errorMessage
            });

            throw error;
        }
    }

    /**
     * Get performance metrics from the engine
     */
    getPerformanceMetrics(): PerformanceMetrics {
        if (!this.engine) {
            return {
                initTime: 0,
                totalAnalyses: 0,
                averageProcessingTime: 0,
                errors: 0
            };
        }

        return this.engine.getPerformanceMetrics();
    }

    /**
     * Get model information
     */
    getModelInfo(): ModelInfo | null {
        if (!this.engine) {
            return null;
        }

        return this.engine.getModelInfo();
    }

    /**
     * Check if the engine is ready
     */
    isReady(): boolean {
        return this.engine !== null && this.engine.isReady;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }

        self.postMessage({
            type: 'disposed'
        });
    }
}

// Create worker instance and expose it via Comlink
const worker = new ATSWorker();
expose(worker);

// Export type for use in main thread
export type { ATSWorker };
