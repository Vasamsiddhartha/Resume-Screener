// Configure PDF.js worker with fallback for different environments
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
    ).toString();
} catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

/**
 * A sophisticated text parser to extract, clean, and structure content from resumes and job descriptions.
 * It uses a multi-stage process to ensure the most relevant information is passed to the AI models.
 * It can handle both File objects (PDF, TXT) and raw text strings as input.
 */
import * as pdfjsLib from 'pdfjs-dist';
import nlp from 'compromise';
import emailRegex from 'email-regex';

// Type definition for the parser's output
export interface ParserOutput {
    prioritizedText: string;
    sections: { [key: string]: string };
}

// Configure PDF.js worker with fallback for different environments
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
    ).toString();
} catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

/**
 * A sophisticated text parser to extract, clean, and structure content from resumes and job descriptions.
 * It uses a multi-stage process to ensure the most relevant information is passed to the AI models.
 * It can handle both File objects (PDF, TXT) and raw text strings as input.
 */
export class IntelligentTextParser {
    private readonly sectionPatterns: { [key: string]: RegExp };
    private readonly noisePatterns: (RegExp | ((options?: any) => RegExp))[];

    constructor() {
        // Patterns to identify the start of a new section. Case-insensitive, multiline.
        this.sectionPatterns = {
            skills: /^(skills|competencies|technologies|technical skills|core competencies|technical expertise|qualifications|required qualifications|requirements|key skills|areas of expertise|proficiencies|toolset|technical proficiencies|design tools|design platforms|design expertise|technology stack)/im,
            experience: /^(experience|employment|work history|professional experience|career history|work experience)/im,
            summary: /^(summary|profile|objective|about me|professional summary|career objective)/im,
            education: /^(education|qualifications|academic background|degree|academic|certifications)/im,
            achievements: /^(achievements|accomplishments|awards|honors)/im,
            projects: /^(projects|portfolio|key projects)/im,
        };

        // Regex patterns to remove irrelevant noise from the text
        this.noisePatterns = [
            emailRegex({exact: false}), // From the email-regex library
            /(\(\d{3}\)|\d{3})[- .]?\d{3}[- .]?\d{4}/g,   // Phone numbers
            /linkedin\.com\/in\/[\w-]+/gi,             // LinkedIn URLs
            /github\.com\/[\w-]+/gi,                  // GitHub URLs
            /https?:\/\/[^\s]+/g, // All other URLs
        ];
    }

    /**
     * The main public method to process a document file.
     * @param file The resume or job description file (PDF or TXT).
     * @returns A promise that resolves to the structured parser output.
     */
    public async parseFile(file: File): Promise<ParserOutput> {
        const rawText = await this._extractTextFromFile(file);
        return this.processText(rawText);
    }

    /**
     * The main public method to process a raw text string.
     * @param text The raw text from a textarea paste.
     * @returns The structured parser output.
     */
    public parseText(text: string): ParserOutput {
        return this.processText(text);
    }

    /**
     * Central processing pipeline for raw text, used by both file and text inputs.
     */
    private processText(rawText: string): ParserOutput {
        const startTime = Date.now();

        // 1. Identify and extract content by sections
        const sections = this._extractSections(rawText);

        // 2. Remove noise from each section
        const cleanedSections = this._removeNoise(sections);

        // 3. Prioritize sections to create the final, dense text block
        const prioritizedText = this._prioritizeContent(cleanedSections);

        // 4. Ensure content fits within token limits
        const finalText = this._truncateToTokenLimit(prioritizedText);

        const processingTime = Date.now() - startTime;
        console.log(`[TextParser] Processed ${rawText.length} → ${finalText.length} chars in ${processingTime}ms`);

        return { prioritizedText: finalText, sections: cleanedSections };
    }

    /**
     * Extracts raw text from a File object.
     */
    private async _extractTextFromFile(file: File): Promise<string> {
        if (file.type === 'application/pdf') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
                let fullText = '';
                for (let i = 1; i <= pdfDocument.numPages; i++) {
                    const page = await pdfDocument.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => (item as any).str).join(' ');
                    fullText += pageText + '\n';
                }
                return fullText;
            } catch (error) {
                console.error("Error parsing PDF:", error);
                throw new Error(`Failed to parse PDF file: ${file.name}`);
            }
        } else if (file.type.startsWith('text/')) {
            return file.text();
        } else {
            throw new Error(`Unsupported file type: ${file.type}`);
        }
    }

    private _extractSections(text: string): { [key: string]: string } {
        const sections: { [key: string]: string } = { general: '' };
        let currentSection = 'general';
        const doc = nlp(text);

        doc.sentences().forEach(sentence => {
            let sentenceText = sentence.text().trim();
            if (!sentenceText) return;

            let detectedSection: string | null = null;
            let matchedPattern: RegExp | null = null;

            if (sentenceText.length < 50 && sentenceText.length > 2) {
                for (const [sectionName, pattern] of Object.entries(this.sectionPatterns)) {
                    if (pattern.test(sentenceText)) {
                        detectedSection = sectionName;
                        matchedPattern = pattern;
                        break;
                    }
                }
            }

            if (detectedSection && matchedPattern) {
                currentSection = detectedSection;
                if (!sections[currentSection]) {
                    sections[currentSection] = '';
                }
                const contentWithoutHeader = sentenceText.replace(matchedPattern, '').trim();
                if (contentWithoutHeader) {
                    sections[currentSection] += ' ' + contentWithoutHeader;
                }
            } else {
                sections[currentSection] = (sections[currentSection] || '') + ' ' + sentenceText;
            }
        });

        for (const sectionName in sections) {
            sections[sectionName] = sections[sectionName].trim();
        }

        return sections;
    }

    private _removeNoise(sections: { [key: string]: string }): { [key: string]: string } {
        const cleaned: { [key: string]: string } = {};
        for (const [section, content] of Object.entries(sections)) {
            let cleanContent = content;
            this.noisePatterns.forEach(patternOrFn => {
                const pattern = typeof patternOrFn === 'function' ? patternOrFn() : patternOrFn;
                cleanContent = cleanContent.replace(pattern, '');
            });
            cleaned[section] = cleanContent.replace(/\s+/g, ' ').trim();
        }
        return cleaned;
    }

    private _prioritizeContent(sections: { [key: string]: string }): string {
        const priority = ['skills', 'experience', 'summary', 'projects', 'achievements', 'education', 'general'];
        let result = '';

        for (const section of priority) {
            if (sections[section] && sections[section].length > 2) {
                result += sections[section] + ' \n\n';
            }
        }

        if (!result.trim() && sections.general) {
            return sections.general;
        }

        return result.trim();
    }

    private _truncateToTokenLimit(text: string, maxTokens: number = 3000): string {
        const estimatedTokens = text.split(/\s+/).length * 1.3;
        if (estimatedTokens <= maxTokens) {
            return text;
        }
        const maxWords = Math.floor(maxTokens / 1.3);
        const words = text.split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }
        return words.slice(0, maxWords).join(' ') + '...';
    }
}

