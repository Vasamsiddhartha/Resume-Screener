import type { ATSErrorType } from '../types';
import { ATSEngineError } from './errors'; // Import ATSEngineError from new file

// Define a type for our skill dictionary for better readability and type safety
export type SkillDictionary = Map<string, string>; // Maps skill variation to canonical skill

/**
 * SkillExtractor class to handle loading a pre-processed skill taxonomy and extracting/normalizing skills from text.
 * Designed to be lightweight and efficient for frontend use.
 */
export class SkillExtractor {
    private skillDictionary: SkillDictionary | null = null;
    private readonly skillTaxonomyPath: string;

    constructor(skillTaxonomyPath: string = '/skills_taxonomy.json') {
        this.skillTaxonomyPath = skillTaxonomyPath;
    }

    /**
     * Loads the pre-processed skill taxonomy JSON and builds an in-memory skill dictionary.
     * This method should be called once during initialization.
     * @returns A Promise that resolves when the dictionary is built.
     */
    public async initialize(): Promise<void> {
        if (this.skillDictionary) {
            console.log('[SkillExtractor] Skill dictionary already initialized.');
            return;
        }

        try {
            console.log(`[SkillExtractor] Loading skill taxonomy from: ${this.skillTaxonomyPath}`);
            const response = await fetch(this.skillTaxonomyPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch skill taxonomy: ${response.statusText}`);
            }
            console.log('[SkillExtractor] Skill taxonomy fetched successfully. Parsing JSON...');
            const json = await response.json();
            this.skillDictionary = new Map<string, string>(Object.entries(json));
            console.log(`[SkillExtractor] Skill dictionary built with ${this.skillDictionary.size} entries.`);
        } catch (error) {
            const atsError = new ATSEngineError(
                `Failed to load or parse skill taxonomy: ${error instanceof Error ? error.message : String(error)}`,
                'SKILL_EXTRACTION_ERROR' as ATSErrorType, // Cast to ATSErrorType
                'SKILL_001',
                { originalError: error }
            );
            throw atsError;
        }
    }

    /**
     * Extracts and normalizes individual skill phrases from a given text block.
     * This method uses a dictionary-based approach for efficiency.
     * @param textBlock The text content of a skills section (e.g., from resume or job description).
     * @returns A Set of unique, canonical skill labels.
     */
    public extractSkills(textBlock: string): Set<string> {
        if (!this.skillDictionary) {
            throw new ATSEngineError(
                'Skill dictionary not initialized. Call initialize() first.',
                'SKILL_EXTRACTION_ERROR' as ATSErrorType,
                'SKILL_002'
            );
        }

        const foundSkills = new Set<string>();
        const lowercasedTextBlock = textBlock.toLowerCase();

        // Tokenize the text block into words
        const words = lowercasedTextBlock.split(/\s+|[,\n\r\t\-•*+()[\]{}&/]/).filter(word => word.length > 1);

        // Generate N-grams (phrases of 1 to MAX_GRAM_LENGTH words)
        const MAX_GRAM_LENGTH = 5; // Max length of multi-word skills to check
        const potentialSkillPhrases: string[] = [];

        for (let i = 0; i < words.length; i++) {
            for (let j = 1; j <= MAX_GRAM_LENGTH && (i + j) <= words.length; j++) {
                const phrase = words.slice(i, i + j).join(' ');
                potentialSkillPhrases.push(phrase);
            }
        }

        // Sort phrases by length in descending order to prioritize longer, more specific matches
        potentialSkillPhrases.sort((a, b) => b.length - a.length);

        // Iterate through potential phrases and check against dictionary
        for (const phrase of potentialSkillPhrases) {
            if (this.skillDictionary.has(phrase)) {
                foundSkills.add(this.skillDictionary.get(phrase)!);
            }
        }

        return foundSkills;
    }

    /**
     * Checks if the skill dictionary has been initialized.
     */
    public isInitialized(): boolean {
        return this.skillDictionary !== null;
    }
}
