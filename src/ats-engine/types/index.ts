/**
 * ATS Analyzer Application - Comprehensive TypeScript Type Definitions
 */

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/**
 * Configuration for the ATS Engine
 */
export interface ATSEngineConfig {
  readonly modelPath?: string;
  readonly privacy?: PrivacyMode;
  readonly maxProcessingTime?: number;
  readonly enableRecommendations?: boolean;
  readonly enableDebugMode?: boolean;
  readonly enablePerformanceMetrics?: boolean;
}

/**
 * Privacy modes for the application
 */
export type PrivacyMode = 'strict' | 'standard' | 'relaxed';


/**
 * Core analysis result interface
 * Encapsulates all analysis outcomes in a cohesive structure
 */
export interface ATSAnalysisResult {
    overallScore: number;
    confidence: number;
    domainCompatibility?: number;
    skillDepth?: number; // Add skillDepth property
    breakdown: {
        semanticMatch: {
            score: number;
            weight: number;
            explanation: string;
        };
    };
    recommendations: RecommendationCollection;
    processingTime: number;
    modelInfo: ModelInfo;
    analysisId: string;
    timestamp: string;
    warnings?: string[];
}

/**
 * Detailed score breakdown with explanations
 */
export interface ScoreBreakdown {
  readonly semanticMatch: ScoreComponent;
}

/**
 * Individual score component following Information Expert principle
 */
export interface ScoreComponent {
  readonly score: number;
  readonly weight: number;
  readonly explanation: string;
}

/**
 * Collection of recommendations grouped by type
 */
export interface RecommendationCollection {
  immediate: Recommendation[];
  strategic: Recommendation[];
  formatting: Recommendation[];
}

/**
 * Individual recommendation with metadata
 */
export interface Recommendation {
  readonly type: RecommendationType;
  readonly action: string;
  readonly impact: string;
  readonly priority: RecommendationPriority;
}

/**
 * Types of recommendations available
 */
export type RecommendationType =
  | 'content_overhaul'
  | 'content_alignment'
  | 'fine_tuning'
  | 'optimization'
  | 'quantification';

/**
 * Priority levels for recommendations
 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * Model information and metadata
 */
export interface ModelInfo {
  readonly name: string;
  readonly version?: string;
  readonly size?: string;
  readonly type?: string;
}

// ============================================================================
// AI/ML PROCESSING TYPES
// ============================================================================

/**
 * Semantic analysis results from transformer models
 */
export interface SemanticResults {
  readonly similarity: number;
  readonly resumeEmbedding: readonly number[];
  readonly jobEmbedding: readonly number[];
}

/**
 * Neural network weights for prediction
 */
export interface NeuralWeights {
  readonly neural_weights: readonly (readonly (readonly number[])[])[];
  readonly neural_biases: readonly (readonly number[])[];
}

/**
 * Complete scoring weights configuration
 */
export interface ScoringWeights {
  readonly ridge_coefficients: readonly number[];
  readonly ridge_intercept: number;
  readonly ensemble_weights: EnsembleWeights;
  readonly neural_weights: readonly (readonly (readonly number[])[])[];
  readonly neural_biases: readonly (readonly number[])[];
  readonly model_info: ModelInfo;
}

/**
 * Ensemble model weights
 */
export interface EnsembleWeights {
  readonly ridge: number;
  readonly neural: number;
}

// ============================================================================
// PERFORMANCE AND METRICS TYPES
// ============================================================================

/**
 * Performance metrics tracking
 * Following Single Responsibility Principle for metrics collection
 */
export interface PerformanceMetrics {
  initTime: number;
  totalAnalyses: number;
  averageProcessingTime: number;
  errors: number;
}

/**
 * Features available in the engine
 */
export interface EnabledFeatures {
  readonly semanticSimilarity: boolean;
  readonly basicRecommendations: boolean;
  readonly privacyMode: boolean;
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Status states for UI feedback
 */
export type StatusState = 'loading' | 'ready' | 'error' | 'processing';

/**
 * Mobile device status tracking
 */
export interface MobileStatusState {
  readonly isVisible: boolean;
  readonly message: string;
}

/**
 * UI element selection result
 * Using null object pattern for safe DOM access
 */
export type ElementResult<T extends HTMLElement = HTMLElement> = T | null;

/**
 * Multiple elements selection result
 */
export type ElementsResult<T extends HTMLElement = HTMLElement> = Record<string, ElementResult<T>>;

/**
 * Device detection results
 */
export interface DeviceInfo {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly userAgent: string;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

/**
 * Event callback function signature
 */
export type EventCallback<T = unknown> = (data: T) => void;

/**
 * Available event types in the ATS Engine
 */
export type ATSEventType = 'statusUpdate' | 'error' | 'ready' | 'analysisComplete';

/**
 * Event callbacks registry
 */
export type EventCallbacks = Record<ATSEventType, EventCallback[]>;

/**
 * Ready event data
 */
export interface ReadyEventData {
  readonly modelInfo: ModelInfo;
  readonly initTime: number;
  readonly features: EnabledFeatures;
}

// ============================================================================
// PDF PROCESSING TYPES
// ============================================================================

/**
 * PDF processing result
 */
export interface PDFProcessingResult {
  readonly text: string;
  readonly pageCount: number;
  readonly metadata?: PDFMetadata;
}

/**
 * PDF document metadata
 */
export interface PDFMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: string;
  readonly creator?: string;
  readonly producer?: string;
  readonly creationDate?: Date;
  readonly modificationDate?: Date;
}

/**
 * PDF upload configuration
 */
export interface PDFUploadConfig {
  readonly maxSizeMB: number;
  readonly allowedTypes: readonly string[];
  readonly enableMetadataExtraction: boolean;
}

// ============================================================================
// SAMPLE DATA TYPES
// ============================================================================

/**
 * Sample data categories
 */
export type SampleCategory =
  | 'tech'
  | 'marketing'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'sales'
  | 'design'
  | 'management';

/**
 * Sample data types
 */
export type SampleType = 'resume' | 'job';

/**
 * Sample data structure
 */
export interface SampleData {
  readonly content: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * Complete samples collection
 */
export type SamplesCollection = Record<SampleCategory, Record<SampleType, SampleData>>;

// ============================================================================
// NAVIGATION AND UI STATE TYPES
// ============================================================================

/**
 * Input view types for the main interface
 */
export type InputViewType = 'manual' | 'upload' | 'samples';

/**
 * Tab section identifiers
 */
export type TabSection = 'resume' | 'job';

/**
 * Modal types available in the application
 */
export type ModalType = 'privacy' | 'terms' | 'about' | 'sponsor' | 'cookies';

/**
 * FAQ item state
 */
export interface FAQItemState {
  readonly isExpanded: boolean;
  readonly question: string;
  readonly answer: string;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Application error types
 * Following Exception handling best practices
 */
export type ATSErrorType =
  | 'INITIALIZATION_ERROR'
  | 'MODEL_LOADING_ERROR'
  | 'ANALYSIS_ERROR'
  | 'INPUT_VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'PDF_PROCESSING_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structured error information
 */
export interface ATSError extends Error {
  readonly type: ATSErrorType;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Input validation result
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Individual validation warning
 */
export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly suggestion?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Debounced function type
 */
export type DebouncedFunction<T extends (...args: unknown[]) => unknown> =
  (...args: Parameters<T>) => void;

/**
 * Character counter information
 */
export interface CharacterCount {
  readonly current: number;
  readonly max: number;
  readonly remaining: number;
  readonly isOverLimit: boolean;
}

/**
 * Text processing options
 */
export interface TextProcessingOptions {
  readonly removeExtraSpaces?: boolean;
  readonly convertLineBreaks?: boolean;
  readonly maxLength?: number;
  readonly preserveFormatting?: boolean;
}

/**
 * Preprocessed input data
 */
export interface PreprocessedInput {
  readonly resume: string;
  readonly job: string;
  readonly metadata?: TextProcessingMetadata;
}

/**
 * Text processing metadata
 */
export interface TextProcessingMetadata {
  readonly originalLength: number;
  readonly processedLength: number;
  readonly transformationsApplied: readonly string[];
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard for checking if an object is an ATSError
 */
export function isATSError(error: unknown): error is ATSError {
  return error instanceof Error && 'type' in error && 'timestamp' in error;
}

/**
 * Type guard for checking if a value is a valid recommendation priority
 */
export function isValidPriority(value: unknown): value is RecommendationPriority {
  return typeof value === 'string' && ['high', 'medium', 'low'].includes(value);
}

/**
 * Type guard for checking if a value is a valid status state
 */
export function isValidStatusState(value: unknown): value is StatusState {
  return typeof value === 'string' && ['loading', 'ready', 'error', 'processing'].includes(value);
}

// ============================================================================
// BRANDED TYPES FOR TYPE SAFETY
// ============================================================================

/**
 * Branded type for analysis IDs to prevent mixing with other strings
 */
export type AnalysisId = string & { readonly __brand: 'AnalysisId' };

/**
 * Branded type for normalized similarity scores (0-1)
 */
export type SimilarityScore = number & { readonly __brand: 'SimilarityScore' };

/**
 * Branded type for ATS scores (0-100)
 */
export type ATSScore = number & { readonly __brand: 'ATSScore' };

/**
 * Helper function to create an AnalysisId
 */
export function createAnalysisId(id: string): AnalysisId {
  return id as AnalysisId;
}

/**
 * Helper function to create a SimilarityScore with validation
 */
export function createSimilarityScore(score: number): SimilarityScore {
  if (score < 0 || score > 1) {
    throw new Error('Similarity score must be between 0 and 1');
  }
  return score as SimilarityScore;
}

/**
 * Helper function to create an ATSScore with validation
 */
export function createATSScore(score: number): ATSScore {
  if (score < 0 || score > 100) {
    throw new Error('ATS score must be between 0 and 100');
  }
  return score as ATSScore;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Re-export utility functions for convenience
  isATSError,
  isValidPriority,
  isValidStatusState,
  createAnalysisId,
  createSimilarityScore,
  createATSScore
};