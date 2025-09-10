// utils/ragProcessor.js
const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class RAGProcessor {
    constructor() {
        this.stopWords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'this', 'these', 'they', 'them',
            'their', 'there', 'then', 'than', 'or', 'but', 'if', 'when',
            'where', 'why', 'how', 'what', 'who', 'which', 'can', 'could',
            'should', 'would', 'may', 'might', 'must', 'shall', 'do', 'does',
            'did', 'have', 'had', 'having', 'been', 'being', 'get', 'got',
            'getting', 'go', 'went', 'going', 'come', 'came', 'coming'
        ]);
    }

    // Extract keywords from text
    extractKeywords(text, maxKeywords = 10) {
        if (!text || typeof text !== 'string') return [];

        // Clean and tokenize text
        const cleanedText = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        const words = cleanedText.split(' ');
        
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            if (word.length > 2 && !this.stopWords.has(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // Sort by frequency and return top keywords
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxKeywords)
            .map(([word]) => word);
    }

    // Generate summary from text
    generateSummary(text, maxSentences = 3) {
        if (!text || typeof text !== 'string') return '';

        // Split into sentences
        const sentences = text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (sentences.length <= maxSentences) {
            return text;
        }

        // Simple scoring based on word frequency
        const wordCount = {};
        const allWords = text.toLowerCase().match(/\b\w+\b/g) || [];
        allWords.forEach(word => {
            if (word.length > 2 && !this.stopWords.has(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // Score sentences
        const scoredSentences = sentences.map(sentence => {
            const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
            const score = words.reduce((acc, word) => {
                return acc + (wordCount[word] || 0);
            }, 0);
            return { sentence, score };
        });

        // Sort by score and take top sentences
        return scoredSentences
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSentences)
            .map(s => s.sentence)
            .join('. ') + '.';
    }

    // Process document content for better searchability
    processDocumentContent(content, title = '') {
        const keywords = this.extractKeywords(content);
        const summary = this.generateSummary(content);
        
        return {
            originalContent: content,
            processedContent: content.toLowerCase(),
            keywords,
            summary,
            title: title.toLowerCase(),
            wordCount: content.split(/\s+/).length,
            processedAt: new Date().toISOString()
        };
    }

    // Simple semantic search scoring
    calculateRelevanceScore(query, document) {
        const queryWords = this.extractKeywords(query);
        const docKeywords = document.keywords || [];
        const docTitle = document.title || '';
        const docContent = document.processedContent || '';

        let score = 0;

        // Title matches (higher weight)
        queryWords.forEach(word => {
            if (docTitle.includes(word)) {
                score += 3;
            }
        });

        // Keyword matches
        queryWords.forEach(word => {
            if (docKeywords.includes(word)) {
                score += 2;
            }
        });

        // Content matches
        queryWords.forEach(word => {
            const matches = (docContent.match(new RegExp(word, 'g')) || []).length;
            score += matches;
        });

        return score;
    }

    // Process uploaded file content
    async processFile(filePath, fileType) {
        try {
            // Check if file exists before processing
            try {
                await fs.access(filePath);
            } catch (accessError) {
                console.error('File does not exist:', filePath);
                throw new Error(`File not found: ${filePath}`);
            }

            let content = '';
            
            switch (fileType) {
                case 'text/plain':
                case 'text/markdown':
                    content = await fs.readFile(filePath, 'utf8');
                    break;
                
                case 'application/pdf':
                    // Extract text content from PDF using pdf-parse
                    try {
                        const dataBuffer = await fs.readFile(filePath);
                        const pdfData = await pdf(dataBuffer);
                        content = pdfData.text;
                        console.log(`PDF processed successfully: ${pdfData.numpages} pages, ${content.length} characters`);
                    } catch (pdfError) {
                        console.error('Error processing PDF:', pdfError);
                        content = `[PDF content extraction failed: ${pdfError.message}]`;
                    }
                    break;
                
                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    // Extract text content from Word documents using mammoth
                    try {
                        const dataBuffer = await fs.readFile(filePath);
                        const result = await mammoth.extractRawText({ buffer: dataBuffer });
                        content = result.value;
                        console.log(`Word document processed successfully: ${content.length} characters`);
                    } catch (wordError) {
                        console.error('Error processing Word document:', wordError);
                        content = `[Word document content extraction failed: ${wordError.message}]`;
                    }
                    break;
                
                default:
                    content = '[Unsupported file type]';
            }

            return this.processDocumentContent(content);
        } catch (error) {
            console.error('Error processing file:', error);
            throw new Error('Failed to process file content');
        }
    }

    // Generate search suggestions based on content
    generateSearchSuggestions(documents, faqs, query) {
        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        // Extract common phrases and terms
        [...documents, ...faqs].forEach(item => {
            const content = (item.content || item.answer || '').toLowerCase();
            const title = (item.title || item.question || '').toLowerCase();
            
            // Find phrases containing the query
            const words = content.split(/\s+/);
            words.forEach((word, index) => {
                if (word.includes(queryLower) && index < words.length - 1) {
                    const phrase = words.slice(index, index + 3).join(' ');
                    if (phrase.length > query.length + 5) {
                        suggestions.add(phrase);
                    }
                }
            });
        });

        return Array.from(suggestions).slice(0, 5);
    }

    // Extract entities (simple implementation)
    extractEntities(text) {
        const entities = {
            emails: [],
            urls: [],
            phoneNumbers: [],
            dates: []
        };

        // Extract emails
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        entities.emails = text.match(emailRegex) || [];

        // Extract URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        entities.urls = text.match(urlRegex) || [];

        // Extract phone numbers (basic pattern)
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        entities.phoneNumbers = text.match(phoneRegex) || [];

        // Extract dates (basic pattern)
        const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
        entities.dates = text.match(dateRegex) || [];

        return entities;
    }
}

module.exports = RAGProcessor;

