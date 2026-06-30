/**
 * ATS Engine - Simplified Core ATS Scoring System
 *
 * A lightweight, focused ATS scoring engine that provides:
 * - Semantic similarity scoring using transformer models
 * - Basic recommendations based on similarity scores
 */

import type {
    ATSAnalysisResult,
    ATSEngineConfig,
    ATSEventType,
    EnabledFeatures,
    EventCallback,
    EventCallbacks,
    ModelInfo,
    PerformanceMetrics,
    ReadyEventData,
    RecommendationCollection,
    SemanticResults
} from '../types';
import types from '../types';
import { IntelligentTextParser } from './text-parser';
import { dot } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';
import { SkillExtractor } from './skill-extractor';
import { ATSEngineError } from './errors';
import { getModelConfig, getModelUrl, getOnnxModelUrls, getWeightsUrl } from '../config/model-config';


interface TransformerModel {
    (
        text: string,
        options?: { pooling?: string; normalize?: boolean }
    ): Promise<{ data: number[] }>;
}


/**
 * Main ATS Engine class
 * Handles ATS scoring and analysis
 */
export class ATSEngine {
    private readonly config: Required<ATSEngineConfig>;
    private model: TransformerModel | null = null;
    private domainModel: TransformerModel | null = null;
    private modelInfo: ModelInfo | null = null;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;
    private readonly performanceMetrics: PerformanceMetrics;
    private readonly eventCallbacks: EventCallbacks;
    private readonly textParser: IntelligentTextParser;
    private readonly skillExtractor: SkillExtractor;
    private polyFeatures: ort.InferenceSession | null = null;
    private scoreMapper: ort.InferenceSession | null = null;
    private neuralMapper: ort.InferenceSession | null = null;
    private ensembleWeights: { ridge: number; neural: number } | null = null;

    constructor(config: ATSEngineConfig = {}) {
        // Use Hugging Face model IDs (industry standard 2025)
        this.config = {
            modelPath: config.modelPath || '0xnbk/nbk-ats-semantic-v1-en',
            privacy: config.privacy || 'strict',
            maxProcessingTime: config.maxProcessingTime || 30000,
            enableRecommendations: config.enableRecommendations !== false,
            enableDebugMode: config.enableDebugMode || false,
            enablePerformanceMetrics: config.enablePerformanceMetrics !== false
        };

        // Initialize metrics tracking
        this.performanceMetrics = {
            initTime: 0,
            totalAnalyses: 0,
            averageProcessingTime: 0,
            errors: 0
        };

        // Initialize event system
        this.eventCallbacks = {
            statusUpdate: [],
            error: [],
            ready: [],
            analysisComplete: []
        };

        // Initialize text parser
        this.textParser = new IntelligentTextParser();

        // Initialize skill extractor. Use Vite's BASE_URL so the path resolves
        // under the GitHub Pages base prefix (/ATS-Scanner/) in production and
        // from root in dev.
        this.skillExtractor = new SkillExtractor(`${import.meta.env.BASE_URL}skills_taxonomy.json`);
    }

    public async initialize(): Promise<ATSEngine> {
        if (this.isInitialized) {
            this.emit('statusUpdate', 'Engine already initialized');
            return this;
        }

        const initStartTime = Date.now();

        try {
            this.emit('statusUpdate', 'Initializing ATS Engine...');
            await this.loadModel();

            this.isInitialized = true;
            this.performanceMetrics.initTime = Date.now() - initStartTime;
            this.emit('statusUpdate', 'ATS Engine ready');
            this.emit('ready', {
                modelInfo: this.modelInfo!,
                initTime: this.performanceMetrics.initTime,
                features: this.getEnabledFeatures()
            } satisfies ReadyEventData);
            return this;
        } catch (error) {
            const atsError = new ATSEngineError(
                `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
                'INITIALIZATION_ERROR',
                'INIT_001',
                { originalError: error }
            );
            throw atsError;
        }
    }

    public async score(
        resumeInput: File | string,
        jobInput: File | string
    ): Promise<ATSAnalysisResult> {
        if (!this.isInitialized) {
            throw new ATSEngineError('ATS Engine not initialized. Call initialize() first.', 'ANALYSIS_ERROR', 'SCORE_001');
        }

        const startTime = Date.now();
        let analysisWarnings: string[] = [];
        try {
            this.emit('statusUpdate', 'Starting analysis...');
            this.emit('statusUpdate', 'Processing resume input...');
            const resumeData = typeof resumeInput === 'string' ? this.textParser.parseText(resumeInput) : await this.textParser.parseFile(resumeInput);
            this.emit('statusUpdate', 'Processing job description input...');
            const jobData = typeof jobInput === 'string' ? this.textParser.parseText(jobInput) : await this.textParser.parseFile(jobInput);

            const extractedResumeSkills = this.skillExtractor.extractSkills(resumeData.prioritizedText);
            const extractedJobSkills = this.skillExtractor.extractSkills(jobData.prioritizedText);


            if (extractedResumeSkills.size === 0) {
                const warningMsg = 'Your resume\'s format or pattern made it difficult to extract individual skills. This may impact scoring accuracy. Ensure skills are listed under clear headings or bullet points.';
                analysisWarnings.push(warningMsg);
            }

            if (this.config.enableDebugMode) {
                console.log('--- Extracted Individual Resume Skills ---');
                console.log(Array.from(extractedResumeSkills).join(', ') || 'No individual skills found in resume.');
                console.log('--- Extracted Individual Job Description Skills ---');
                console.log(Array.from(extractedJobSkills).join(', ') || 'No individual skills found in job description.');
            }

            const matchedSkills = new Set<string>();
            extractedResumeSkills.forEach(skill => {
                if (extractedJobSkills.has(skill)) {
                    matchedSkills.add(skill);
                }
            });

            if (this.config.enableDebugMode) {
                console.log('--- Matched Skills ---');
                console.log(Array.from(matchedSkills).join(', ') || 'No matched skills found.');
            }

            const SKILL_MATCH_PENALTY = 20;

            const preprocessed = this.preprocessInputs(resumeData.prioritizedText, jobData.prioritizedText);

            this.emit('statusUpdate', 'Processing with AI models...');

            const [semanticResults, domainScore] = await Promise.all([
                this.getSemanticScore(preprocessed.resume, preprocessed.job),
                this.getDomainScore(preprocessed.resume, preprocessed.job)
            ]);

            this.emit('statusUpdate', 'Calculating final score...');
            let hybridResults = await this.calculateFinalATSScore(
                semanticResults,
                domainScore,
                matchedSkills.size,
                extractedResumeSkills.size,
                extractedJobSkills.size
            );
            let finalScore = hybridResults.score;

            if (matchedSkills.size === 0) {
                finalScore = Math.max(0, finalScore - SKILL_MATCH_PENALTY);
                const warningMsg = `No matching skills found between your resume and the job description. The current ATS score may not fully reflect your potential. Consider tailoring your resume skills more closely to the job description.`;
                analysisWarnings.push(warningMsg);
            }

            const confidence = hybridResults.confidence;
            const recommendations = this.config.enableRecommendations ? this.generateRecommendations(semanticResults, finalScore) : this.getEmptyRecommendations();
            const processingTime = (Date.now() - startTime) / 1000;
            const analysisResult: ATSAnalysisResult = {
                overallScore: Math.round(finalScore * 10) / 10,
                confidence: confidence,
                domainCompatibility: Math.max(0, Math.min(100, (domainScore * 50 + 50))),
                skillDepth: hybridResults.skillDepth,
                breakdown: {
                    semanticMatch: {
                        score: Math.round(this.validateSimilarity(semanticResults.similarity) * 100 * 10) / 10,
                        weight: 1.0,
                        explanation: `Semantic similarity: ${Math.round(this.validateSimilarity(semanticResults.similarity) * 100)}%`
                    }
                },
                recommendations,
                processingTime,
                modelInfo: this.modelInfo!,
                analysisId: types.createAnalysisId(`ats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
                timestamp: new Date().toISOString(),
                warnings: analysisWarnings.length > 0 ? analysisWarnings : undefined,
            };
            this.updatePerformanceMetrics(processingTime);
            this.emit('analysisComplete', analysisResult);
            return analysisResult;
        } catch (error) {
            this.performanceMetrics.errors++;
            const atsError = new ATSEngineError(
                `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
                'ANALYSIS_ERROR', 'SCORE_002', { originalError: error }
            );
            this.emit('error', atsError.message);
            throw atsError;
        }
    }

    private async loadModel(): Promise<void> {
        try {
            this.emit('statusUpdate', 'Loading models...');
            this.modelInfo = {
                size: 'ensemble',
                name: 'Multi-Model Ensemble',
                type: 'Semantic + Domain + Ensemble',
                version: 'V1'
            };
            const transformers = await this.waitForTransformers();
            const { pipeline, env } = transformers;

            // Get dynamic model configuration (local or remote)
            const modelConfig = getModelConfig();

            // Configure transformers environment based on model config
            env.allowLocalModels = modelConfig.allowLocalModels;
            env.allowRemoteModels = modelConfig.allowRemoteModels;
            env.localModelPath = modelConfig.allowLocalModels ? './' : '';
            env.remoteHost = modelConfig.remoteHost;
            env.remotePathTemplate = modelConfig.remotePathTemplate;

            // Get model URLs (dynamic based on environment)
            const semanticModelUrl = getModelUrl('semantic');
            const domainModelUrl = getModelUrl('domain');

            this.emit('statusUpdate', 'Loading embeddings...');
            console.log(`[ATSEngine] Loading semantic model (${modelConfig.source}):`, semanticModelUrl);

            this.model = await pipeline('feature-extraction', semanticModelUrl, {
                quantized: true,
                device: 'wasm'
            }) as TransformerModel;
            console.log(`[ATSEngine] ✅ Semantic model loaded (${modelConfig.source})`);

            this.emit('statusUpdate', 'Loading classifier...');
            console.log(`[ATSEngine] Loading domain model (${modelConfig.source}):`, domainModelUrl);
            this.domainModel = await pipeline('feature-extraction', domainModelUrl, {
                quantized: true,
                device: 'wasm'
            }) as TransformerModel;
            console.log(`[ATSEngine] ✅ Domain model loaded (${modelConfig.source})`);

            this.emit('statusUpdate', 'Loading scoring...');
            console.log('[ATSEngine] Starting ONNX and SkillExtractor initialization...');

            // Get ONNX model URLs (dynamic based on environment)
            const onnxModelUrls = getOnnxModelUrls();

            console.log(`[ATSEngine] Loading ONNX models (${modelConfig.source}):`, onnxModelUrls);

            try {
                const [polyFeatures, scoreMapper, neuralMapper] = await Promise.all([
                    ort.InferenceSession.create(onnxModelUrls.polyFeatures),
                    ort.InferenceSession.create(onnxModelUrls.scoreMapper),
                    ort.InferenceSession.create(onnxModelUrls.neuralMapper),
                    this.skillExtractor.initialize()
                ]);

                this.polyFeatures = polyFeatures;
                this.scoreMapper = scoreMapper;
                this.neuralMapper = neuralMapper;

                console.log(`[ATSEngine] ✅ ONNX models loaded (${modelConfig.source})`);
            } catch (error) {
                console.warn(`[ATSEngine] ONNX models not available (${modelConfig.source}), using simplified scoring:`, error);
                this.polyFeatures = null;
                this.scoreMapper = null;
                this.neuralMapper = null;

                // Still initialize skill extractor
                await this.skillExtractor.initialize();
                console.log('[ATSEngine] ✅ Skill extractor initialized, using semantic-only scoring');
            }

            this.emit('statusUpdate', 'Loading ensemble weights...');
            const weightsUrl = getWeightsUrl();
            console.log(`[ATSEngine] Loading weights (${modelConfig.source}):`, weightsUrl);

            try {
                const weightsResponse = await fetch(weightsUrl);
                if (!weightsResponse.ok) {
                    console.warn(`[ATSEngine] Weights file not found (${modelConfig.source}), trying alternative paths...`);

                    // Try alternative filename (extract base path and try weights.json)
                    const baseUrl = weightsUrl.substring(0, weightsUrl.lastIndexOf('/'));
                    const altResponse = await fetch(`${baseUrl}/weights.json`);
                    if (altResponse.ok) {
                        const weightsData = await altResponse.json();
                        this.ensembleWeights = weightsData.ensemble_weights;
                        console.log(`[ATSEngine] ✅ Alternative weights loaded (${modelConfig.source})`);
                    } else {
                        console.warn('[ATSEngine] No weights file found, using simplified scoring');
                        this.ensembleWeights = null;
                    }
                } else {
                    const weightsData = await weightsResponse.json();
                    this.ensembleWeights = weightsData.ensemble_weights;
                    console.log(`[ATSEngine] ✅ Ensemble weights loaded (${modelConfig.source})`);
                }
            } catch (error) {
                console.warn('[ATSEngine] Failed to load weights, falling back to simplified scoring:', error);
                this.ensembleWeights = null;
            }

            this.emit('statusUpdate', 'Models ready');
        } catch (error) {
            throw new ATSEngineError(
                `Model loading failed: ${error instanceof Error ? error.message : String(error)}`,
                'MODEL_LOADING_ERROR', 'MODEL_002', { originalError: error }
            );
        }
    }

    private async getSemanticScore(resumeText: string, jobText: string): Promise<SemanticResults> {
        if (!this.model) {
            throw new ATSEngineError('Semantic model not loaded', 'ANALYSIS_ERROR', 'SEMANTIC_001');
        }
        return this._getEmbeddingSimilarity(this.model, resumeText, jobText);
    }

    private async getDomainScore(resumeText: string, jobText: string): Promise<number> {
        if (!this.domainModel) {
            throw new ATSEngineError('Domain model not loaded', 'ANALYSIS_ERROR', 'DOMAIN_001');
        }
        const { similarity } = await this._getEmbeddingSimilarity(this.domainModel, resumeText, jobText);
        return similarity;
    }

    private async _getEmbeddingSimilarity(model: TransformerModel, text1: string, text2: string): Promise<SemanticResults> {
        const maxLength = 10000;
        const truncatedText1 = text1.substring(0, maxLength);
        const truncatedText2 = text2.substring(0, maxLength);

        const modelOptions = { pooling: 'mean', normalize: true };

        const [embedding1Result, embedding2Result] = await Promise.all([
            model(truncatedText1, modelOptions),
            model(truncatedText2, modelOptions)
        ]);

        const similarity = dot(embedding1Result.data, embedding2Result.data);

        return {
            similarity: similarity,
            resumeEmbedding: [...embedding1Result.data],
            jobEmbedding: [...embedding2Result.data]
        };
    }

    private validateSimilarity(similarity: number): number {
        if (isNaN(similarity)) return 0.5;
        // Clamp semantic similarity between 0 and 1 for consistent scoring
        return Math.max(0, Math.min(1, similarity));
    }


    private async calculateFinalATSScore(
        semanticResults: SemanticResults,
        domainSimilarity: number,
        matchedSkillsCount: number,
        resumeSkillsCount: number,
        jobSkillsCount: number
    ): Promise<{ score: number; confidence: number; skillDepth: number }> {
        const semanticSimilarity = this.validateSimilarity(semanticResults.similarity);

        // Domain score > 0.5 indicates same-domain alignment
        const isSameDomain = domainSimilarity > 0.5;

        let finalScore: number = 0;

        // --- Incorporate Skill Match --- 
        let skillMatchFactor = 1.0; // Default to no change
        const NO_SKILLS_PENALTY = 30; // Penalty if no skills are found in either resume or job

        if (resumeSkillsCount === 0 || jobSkillsCount === 0) {
            // If no skills extracted from either, apply a heavy penalty
            finalScore = Math.max(0, finalScore - NO_SKILLS_PENALTY);
            skillMatchFactor = 0; // Effectively zero out skill contribution
        } else {
            const averageSkills = (resumeSkillsCount + jobSkillsCount) / 2;
            if (averageSkills > 0) {
                skillMatchFactor = matchedSkillsCount / averageSkills;
            } else {
                skillMatchFactor = 0; // Should not happen if resumeSkillsCount or jobSkillsCount > 0
            }
        }

        if (this.polyFeatures && this.scoreMapper && this.neuralMapper && this.ensembleWeights) {
            const atsScore = await this.calculateEnsembleScore(semanticSimilarity);
            // Conditional domain boost: only apply if domain matches AND skill match is at least moderate
            if (isSameDomain && skillMatchFactor > 0.3) {
                finalScore = 50 + (atsScore * 0.5);
            } else {
                finalScore = atsScore * 0.5; // No domain boost, or domain mismatch
            }
        } else {
            const baseScore = semanticSimilarity * 100;
            if (isSameDomain && skillMatchFactor > 0.3) {
                finalScore = 50 + (baseScore * 0.5);
            }
        }

        // Apply a non-linear impact: small match has larger penalty, good match has less impact
        if (skillMatchFactor < 0.1) { // Very, very low match
            finalScore *= 0.5; // Halve the score
        } else if (skillMatchFactor < 0.3) { // Low match
            finalScore *= 0.7; // Reduce by 30%
        } else if (skillMatchFactor < 0.5) { // Moderate match
            finalScore *= 0.85; // Reduce by 15%
        }
        // Confidence: blend of semantic similarity and domain certainty
        const overallConfidence = (semanticSimilarity * 0.7 + Math.abs(domainSimilarity) * 0.3) * 100;

        if (this.config.enableDebugMode) {
            console.log('🔍 Hybrid Scoring Breakdown:');
            console.log(`  - Semantic Similarity: ${semanticSimilarity.toFixed(3)}`);
            console.log(`  - Domain Similarity: ${domainSimilarity.toFixed(3)} -> ${isSameDomain ? 'SAME ✅' : 'DIFFERENT ❌'}`);
            console.log(`  - Matched Skills Count: ${matchedSkillsCount}`);
            console.log(`  - Resume Skills Count: ${resumeSkillsCount}`);
            console.log(`  - Job Skills Count: ${jobSkillsCount}`);
            console.log(`  - Skill Match Factor: ${skillMatchFactor.toFixed(2)}`);
            console.log(`  - Final Score (before clamp): ${finalScore.toFixed(1)}`);
            console.log(`  - Confidence: ${overallConfidence.toFixed(1)}%`);
        }

        return {
            score: Math.max(0, Math.min(100, finalScore)),
            confidence: Math.round(overallConfidence * 10) / 10,
            skillDepth: Math.round(skillMatchFactor * 100) // Scale to 0-100
        };
    }

    private async calculateEnsembleScore(similarity: number): Promise<number> {
        if (!this.polyFeatures || !this.scoreMapper || !this.neuralMapper || !this.ensembleWeights) {
            return similarity * 100;
        }

        const polyInput = new ort.Tensor('float32', [similarity], [1, 1]);
        const polyResult = await this.polyFeatures.run({ input: polyInput });
        const polyFeatures = polyResult[Object.keys(polyResult)[0]].data as Float32Array;

        const ridgeInput = new ort.Tensor('float32', polyFeatures, [1, polyFeatures.length]);
        const ridgeResult = await this.scoreMapper.run({ input: ridgeInput });
        const ridgeScore = (ridgeResult[Object.keys(ridgeResult)[0]].data as Float32Array)[0];

        const neuralFeatures = new Float32Array([
            similarity,
            similarity ** 2,
            similarity ** 3,
            Math.abs(similarity),
            Math.tanh(similarity * 3),
            Math.sqrt(Math.abs(similarity)),
            Math.log1p(Math.abs(similarity))
        ]);

        const neuralInput = new ort.Tensor('float32', neuralFeatures, [1, 7]);
        const neuralResult = await this.neuralMapper.run({ input: neuralInput });
        const neuralScore = (neuralResult[Object.keys(neuralResult)[0]].data as Float32Array)[0];

        const ensembleScore = this.ensembleWeights.ridge * ridgeScore + this.ensembleWeights.neural * neuralScore;

        return Math.max(0, Math.min(100, ensembleScore));
    }

    private generateRecommendations(
        semanticResults: SemanticResults,
        overallScore: number
    ): RecommendationCollection {
        const similarity = semanticResults.similarity;
        const recommendations: RecommendationCollection = {
            immediate: [],
            strategic: [],
            formatting: []
        };

        if (similarity < 0.4) {
            recommendations.immediate.push({
                type: 'content_overhaul',
                action: 'Your resume content appears quite different from the job requirements. Consider significant revisions to better align with the role.',
                impact: 'Major improvement potential',
                priority: 'high'
            });
        } else if (similarity < 0.6) {
            recommendations.strategic.push({
                type: 'content_alignment',
                action: 'Improve content alignment by incorporating more relevant terminology and concepts from the job description.',
                impact: 'Significant improvement potential',
                priority: 'high'
            });
        } else if (similarity < 0.8) {
            recommendations.strategic.push({
                type: 'fine_tuning',
                action: "Good foundation! Fine-tune your resume language to more closely mirror the job posting's tone and specific requirements.",
                impact: 'Moderate improvement potential',
                priority: 'medium'
            });
        } else {
            recommendations.strategic.push({
                type: 'optimization',
                action: 'Excellent content alignment! Focus on formatting, quantifying achievements, and interview preparation.',
                impact: 'Polish and presentation',
                priority: 'low'
            });
        }

        if (overallScore < 85) {
            recommendations.formatting.push({
                type: 'quantification',
                action: 'Add specific numbers, percentages, or measurable outcomes to strengthen your achievements.',
                impact: 'Enhanced credibility',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    private getEmptyRecommendations(): RecommendationCollection {
        return {
            immediate: [],
            strategic: [],
            formatting: []
        };
    }

    private async waitForTransformers(maxWait: number = 10000): Promise<any> {
        // Support both window (main thread) and self (worker) contexts
        const globalContext = typeof window !== 'undefined' ? window : (self as any);

        if (globalContext.transformers) return globalContext.transformers;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new ATSEngineError('Transformers library failed to load within timeout', 'MODEL_LOADING_ERROR', 'TRANSFORMER_001')), maxWait);
            const checkInterval = setInterval(() => {
                if (globalContext.transformers) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve(globalContext.transformers!);
                }
            }, 100);

            // Only listen for events in window context (workers don't have this event)
            if (typeof window !== 'undefined') {
                window.addEventListener('transformersReady', () => {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve(globalContext.transformers!);
                }, { once: true });
            }
        });
    }

    private preprocessInputs(resumeText: string, jobText: string, _options: Record<string, unknown> = {}): { resume: string; job: string } {
        if (!resumeText || !jobText) throw new ATSEngineError('Both resume and job description are required', 'INPUT_VALIDATION_ERROR', 'INPUT_001');
        if (resumeText.length < 50) throw new ATSEngineError('Resume text is too short (minimum 50 characters)', 'INPUT_VALIDATION_ERROR', 'INPUT_002');
        if (jobText.length < 30) throw new ATSEngineError('Job description is too short (minimum 30 characters)', 'INPUT_VALIDATION_ERROR', 'INPUT_003');
        return { resume: resumeText.trim(), job: jobText.trim() };
    }


    private updatePerformanceMetrics(processingTime: number): void {
        this.performanceMetrics.totalAnalyses++;
        this.performanceMetrics.averageProcessingTime = (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalAnalyses - 1) + processingTime) / this.performanceMetrics.totalAnalyses;
    }

    private getEnabledFeatures(): EnabledFeatures {
        return { semanticSimilarity: true, basicRecommendations: this.config.enableRecommendations, privacyMode: this.config.privacy === 'strict' };
    }

    public getPerformanceMetrics(): Readonly<PerformanceMetrics> { return Object.freeze({ ...this.performanceMetrics }); }
    public getConfig(): Readonly<Required<ATSEngineConfig>> { return Object.freeze({ ...this.config }); }
    public getModelInfo(): Readonly<ModelInfo> | null { return this.modelInfo ? Object.freeze({ ...this.modelInfo }) : null; }

    public on<T = unknown>(event: ATSEventType, callback: EventCallback<T>): void {
        if (!this.eventCallbacks[event]) this.eventCallbacks[event] = [];
        this.eventCallbacks[event].push(callback as EventCallback);
    }

    public off<T = unknown>(event: ATSEventType, callback: EventCallback<T>): void {
        if (this.eventCallbacks[event]) {
            const index = this.eventCallbacks[event].indexOf(callback as EventCallback);
            if (index > -1) this.eventCallbacks[event].splice(index, 1);
        }
    }

    private emit(event: ATSEventType, data?: unknown): void {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try { callback(data); } catch (error) { console.warn(`Error in event callback for ${event}:`, error); }
            });
        }
        if (this.config.enableDebugMode) console.debug(`[ATSEngine] ${event}:`, data);
    }

    public dispose(): void {
        this.model = null;
        this.domainModel = null;
        this.polyFeatures = null;
        this.scoreMapper = null;
        this.neuralMapper = null;
        this.ensembleWeights = null;
        this.isInitialized = false;
        this.initializationError = null;
    }

    public get isReady(): boolean { return this.isInitialized && !this.initializationError; }
    public get lastError(): Error | null { return this.initializationError; }
}

export default ATSEngine;
