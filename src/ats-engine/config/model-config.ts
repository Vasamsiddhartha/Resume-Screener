/**
 * Dynamic Model Configuration
 * Supports both local development and production (Cloudflare R2) model loading
 */

/** Model file paths configuration */
export interface ModelPaths {
    semanticModel: string;
    domainModel: string;
    baseUrl: string;
    onnxBasePath: string;
    weightsPath: string;
}

/** Complete model configuration including source and paths */
export interface ModelConfig {
    source: 'local' | 'remote';
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    remoteHost: string;
    remotePathTemplate: string;
    paths: ModelPaths;
}

/**
 * Get model configuration based on environment variables
 * @returns Model configuration for current environment
 */
export function getModelConfig(): ModelConfig {
    // ATS Scanner bundles the model weights in public/models, so the engine
    // loads them locally in both dev and production by default. Set
    // VITE_MODEL_SOURCE=remote to instead stream weights from a CDN/HF Hub.
    const modelSource = import.meta.env.VITE_MODEL_SOURCE || 'local';

    const isLocal = modelSource === 'local';

    // Base configuration
    const config: ModelConfig = {
        source: modelSource as 'local' | 'remote',
        allowLocalModels: isLocal,
        allowRemoteModels: !isLocal,
        // For remote (R2 with HF structure): Use base URL and standard HF path template
        // For local: Empty strings
        remoteHost: isLocal ? '' : (import.meta.env.VITE_MODEL_BASE_URL || 'https://huggingface.co'),
        remotePathTemplate: isLocal ? '' : '{model}/resolve/main/',
        paths: getPaths(isLocal)
    };

    return config;
}

/**
 * Get model paths based on environment
 */
function getPaths(isLocal: boolean): ModelPaths {
    if (isLocal) {
        // Local - serve from public/models. Prefix Vite's BASE_URL so assets
        // resolve under the GitHub Pages base (/ATS-Scanner/) in production and
        // from root ('/') in dev.
        const baseUrl = import.meta.env.VITE_MODEL_BASE_URL || `${import.meta.env.BASE_URL}models`;
        const semanticModelName = import.meta.env.VITE_SEMANTIC_MODEL_PATH || 'nbk-ats-semantic-v1-en';
        const domainModelName = import.meta.env.VITE_DOMAIN_MODEL_PATH || 'nbk-ats-domain-v1-en';

        const semanticModel = `${baseUrl}/${semanticModelName}`;
        const domainModel = `${baseUrl}/${domainModelName}`;

        return {
            semanticModel,
            domainModel,
            baseUrl,
            onnxBasePath: `${semanticModel}/onnx/`,
            weightsPath: `${semanticModel}/universal_score_weights.json`
        };
    } else {
        // Remote - R2 with HuggingFace-style structure
        // Model paths are just model names (e.g., "nbk-ats-semantic-v1-en")
        // transformers.js will construct: {remoteHost}/{model}/resolve/main/
        const baseUrl = import.meta.env.VITE_MODEL_BASE_URL || 'https://huggingface.co';
        const semanticModel = import.meta.env.VITE_SEMANTIC_MODEL_PATH || 'nbk-ats-semantic-v1-en';
        const domainModel = import.meta.env.VITE_DOMAIN_MODEL_PATH || 'nbk-ats-domain-v1-en';

        // For ONNX and weights, construct full URLs manually
        const semanticModelFullPath = `${baseUrl}/${semanticModel}/resolve/main`;

        return {
            semanticModel,  // Just the model name
            domainModel,    // Just the model name
            baseUrl,
            onnxBasePath: `${semanticModelFullPath}/onnx/`,
            weightsPath: `${semanticModelFullPath}/universal_score_weights.json`
        };
    }
}

/**
 * Get model URL for transformers.js pipeline
 * @param modelType - Type of model ('semantic' or 'domain')
 * @returns Full URL path to the model
 */
export function getModelUrl(modelType: 'semantic' | 'domain'): string {
    const config = getModelConfig();
    return modelType === 'semantic' ? config.paths.semanticModel : config.paths.domainModel;
}

/**
 * Get ONNX ensemble model URLs
 * @returns Object containing URLs for all ONNX ensemble models
 */
export function getOnnxModelUrls(): {
    polyFeatures: string;
    scoreMapper: string;
    neuralMapper: string;
} {
    const config = getModelConfig();
    const onnxBasePath = config.paths.onnxBasePath;

    return {
        polyFeatures: `${onnxBasePath}poly_features.onnx`,
        scoreMapper: `${onnxBasePath}score_mapper.onnx`,
        neuralMapper: `${onnxBasePath}neural_mapper.onnx`
    };
}

/**
 * Get ensemble weights JSON file URL
 * @returns URL path to universal_score_weights.json
 */
export function getWeightsUrl(): string {
    const config = getModelConfig();
    return config.paths.weightsPath;
}