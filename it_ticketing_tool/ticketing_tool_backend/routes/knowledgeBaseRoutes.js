// routes/knowledgeBaseRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const RAGProcessor = require('../utils/ragProcessor');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/knowledge-base');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/markdown'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TXT, DOC, DOCX, and MD files are allowed.'));
        }
    }
});

module.exports = (db, admin, authenticateToken, checkRole) => {
    const knowledgeBaseCollection = db.collection('knowledge_base');
    const faqCollection = db.collection('faqs');
    const ragProcessor = new RAGProcessor();

    // Ensure upload directory exists
    const ensureUploadDir = async () => {
        const uploadDir = path.join(__dirname, '../uploads/knowledge-base');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }
    };

    // Health check endpoint
    router.get('/health', (req, res) => {
        res.status(200).json({ message: 'Knowledge Base API is running' });
    });

    // GET /api/knowledge-base/documents - Get all knowledge base documents
    router.get('/documents', authenticateToken, async (req, res) => {
        try {
            const { search, category, page = 1, limit = 10 } = req.query;
            let query = knowledgeBaseCollection.orderBy('created_at', 'desc');

            // Apply search filter
            if (search) {
                query = knowledgeBaseCollection
                    .where('title', '>=', search)
                    .where('title', '<=', search + '\uf8ff')
                    .orderBy('title')
                    .orderBy('created_at', 'desc');
            }

            // Apply category filter
            if (category) {
                query = query.where('category', '==', category);
            }

            const snapshot = await query.limit(parseInt(limit) * parseInt(page)).get();
            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at
            }));

            // Apply pagination
            const startIndex = (parseInt(page) - 1) * parseInt(limit);
            const endIndex = startIndex + parseInt(limit);
            const paginatedDocuments = documents.slice(startIndex, endIndex);

            res.status(200).json({
                documents: paginatedDocuments,
                total: documents.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(documents.length / parseInt(limit))
            });
        } catch (error) {
            console.error('Error fetching knowledge base documents:', error);
            res.status(500).json({ error: 'Failed to fetch documents' });
        }
    });

    // GET /api/knowledge-base/documents/:id - Get specific document
    router.get('/documents/:id', authenticateToken, async (req, res) => {
        try {
            const docId = req.params.id;
            const doc = await knowledgeBaseCollection.doc(docId).get();
            
            if (!doc.exists) {
                return res.status(404).json({ error: 'Document not found' });
            }

            const documentData = {
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at
            };

            res.status(200).json(documentData);
        } catch (error) {
            console.error('Error fetching document:', error);
            res.status(500).json({ error: 'Failed to fetch document' });
        }
    });

    // POST /api/knowledge-base/documents - Create new document
    router.post('/documents', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const { title, content, category, tags, isPublic } = req.body;
            
            if (!title || !content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }

            // Process content with RAG
            const processedContent = ragProcessor.processDocumentContent(content, title);
            
            const documentData = {
                title,
                content,
                category: category || 'General',
                tags: [...(tags || []), ...processedContent.keywords],
                isPublic: isPublic || false,
                created_by: req.user.uid,
                created_by_email: req.user.email,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                view_count: 0,
                status: 'active',
                // RAG processed data
                summary: processedContent.summary,
                keywords: processedContent.keywords,
                word_count: processedContent.wordCount,
                processed_content: processedContent.processedContent,
                entities: ragProcessor.extractEntities(content)
            };

            const docRef = await knowledgeBaseCollection.add(documentData);
            
            res.status(201).json({
                id: docRef.id,
                message: 'Document created successfully',
                ...documentData
            });
        } catch (error) {
            console.error('Error creating document:', error);
            res.status(500).json({ error: 'Failed to create document' });
        }
    });

    // POST /api/knowledge-base/documents/upload - Upload and process document
    router.post('/documents/upload', authenticateToken, checkRole(['admin', 'support', 'super_admin']), upload.single('file'), async (req, res) => {
        try {
            await ensureUploadDir();
            
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { title, category, tags, isPublic } = req.body;
            const filePath = req.file.path;
            const fileName = req.file.originalname;
            const fileType = req.file.mimetype;

            console.log('File uploaded successfully:', {
                filePath,
                fileName,
                fileType,
                fileSize: req.file.size
            });

            // Small delay to ensure file is fully written
            await new Promise(resolve => setTimeout(resolve, 100));

            // Process file with RAG
            let processedContent;
            try {
                processedContent = await ragProcessor.processFile(filePath, fileType);
            } catch (error) {
                console.error('Error processing file with RAG:', error);
                processedContent = ragProcessor.processDocumentContent(`[Document: ${fileName} - Processing failed]`, title || fileName);
            }

            const documentData = {
                title: title || fileName,
                content: processedContent.originalContent,
                category: category || 'General',
                tags: [...(tags ? tags.split(',').map(tag => tag.trim()) : []), ...processedContent.keywords],
                isPublic: isPublic === 'true',
                file_path: filePath,
                file_name: fileName,
                file_type: fileType,
                created_by: req.user.uid,
                created_by_email: req.user.email,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                view_count: 0,
                status: 'active',
                // RAG processed data
                summary: processedContent.summary,
                keywords: processedContent.keywords,
                word_count: processedContent.wordCount,
                processed_content: processedContent.processedContent,
                entities: processedContent.entities || ragProcessor.extractEntities(processedContent.originalContent)
            };

            const docRef = await knowledgeBaseCollection.add(documentData);
            
            res.status(201).json({
                id: docRef.id,
                message: 'Document uploaded and processed successfully',
                ...documentData
            });
        } catch (error) {
            console.error('Error uploading document:', error);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    });

    // PUT /api/knowledge-base/documents/:id - Update document
    router.put('/documents/:id', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const docId = req.params.id;
            const { title, content, category, tags, isPublic } = req.body;

            const updateData = {
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            if (title) updateData.title = title;
            if (content) updateData.content = content;
            if (category) updateData.category = category;
            if (tags) updateData.tags = tags;
            if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;

            await knowledgeBaseCollection.doc(docId).update(updateData);
            
            res.status(200).json({ message: 'Document updated successfully' });
        } catch (error) {
            console.error('Error updating document:', error);
            res.status(500).json({ error: 'Failed to update document' });
        }
    });

    // DELETE /api/knowledge-base/documents/:id - Delete document
    router.delete('/documents/:id', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const docId = req.params.id;
            
            // Get document to check for file path
            const doc = await knowledgeBaseCollection.doc(docId).get();
            if (doc.exists && doc.data().file_path) {
                try {
                    await fs.unlink(doc.data().file_path);
                } catch (fileError) {
                    console.error('Error deleting file:', fileError);
                }
            }

            await knowledgeBaseCollection.doc(docId).delete();
            
            res.status(200).json({ message: 'Document deleted successfully' });
        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({ error: 'Failed to delete document' });
        }
    });

    // GET /api/knowledge-base/faqs - Get all FAQs
    router.get('/faqs', authenticateToken, async (req, res) => {
        try {
            const { search, category, page = 1, limit = 10 } = req.query;
            let query = faqCollection.orderBy('created_at', 'desc');

            // Apply search filter
            if (search) {
                query = faqCollection
                    .where('question', '>=', search)
                    .where('question', '<=', search + '\uf8ff')
                    .orderBy('question')
                    .orderBy('created_at', 'desc');
            }

            // Apply category filter
            if (category) {
                query = query.where('category', '==', category);
            }

            const snapshot = await query.limit(parseInt(limit) * parseInt(page)).get();
            const faqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at
            }));

            // Apply pagination
            const startIndex = (parseInt(page) - 1) * parseInt(limit);
            const endIndex = startIndex + parseInt(limit);
            const paginatedFaqs = faqs.slice(startIndex, endIndex);

            res.status(200).json({
                faqs: paginatedFaqs,
                total: faqs.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(faqs.length / parseInt(limit))
            });
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            res.status(500).json({ error: 'Failed to fetch FAQs' });
        }
    });

    // POST /api/knowledge-base/faqs - Create new FAQ
    router.post('/faqs', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const { question, answer, category, tags, isPublic } = req.body;
            
            if (!question || !answer) {
                return res.status(400).json({ error: 'Question and answer are required' });
            }

            // Process FAQ content with RAG
            const fullContent = `${question} ${answer}`;
            const processedContent = ragProcessor.processDocumentContent(fullContent, question);
            
            const faqData = {
                question,
                answer,
                category: category || 'General',
                tags: [...(tags || []), ...processedContent.keywords],
                isPublic: isPublic || false,
                created_by: req.user.uid,
                created_by_email: req.user.email,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                view_count: 0,
                status: 'active',
                // RAG processed data
                summary: processedContent.summary,
                keywords: processedContent.keywords,
                word_count: processedContent.wordCount,
                processed_content: processedContent.processedContent,
                entities: ragProcessor.extractEntities(fullContent)
            };

            const docRef = await faqCollection.add(faqData);
            
            res.status(201).json({
                id: docRef.id,
                message: 'FAQ created successfully',
                ...faqData
            });
        } catch (error) {
            console.error('Error creating FAQ:', error);
            res.status(500).json({ error: 'Failed to create FAQ' });
        }
    });

    // PUT /api/knowledge-base/faqs/:id - Update FAQ
    router.put('/faqs/:id', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const faqId = req.params.id;
            const { question, answer, category, tags, isPublic } = req.body;

            const updateData = {
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            if (question) updateData.question = question;
            if (answer) updateData.answer = answer;
            if (category) updateData.category = category;
            if (tags) updateData.tags = tags;
            if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;

            await faqCollection.doc(faqId).update(updateData);
            
            res.status(200).json({ message: 'FAQ updated successfully' });
        } catch (error) {
            console.error('Error updating FAQ:', error);
            res.status(500).json({ error: 'Failed to update FAQ' });
        }
    });

    // DELETE /api/knowledge-base/faqs/:id - Delete FAQ
    router.delete('/faqs/:id', authenticateToken, checkRole(['admin', 'support', 'super_admin']), async (req, res) => {
        try {
            const faqId = req.params.id;
            await faqCollection.doc(faqId).delete();
            
            res.status(200).json({ message: 'FAQ deleted successfully' });
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            res.status(500).json({ error: 'Failed to delete FAQ' });
        }
    });

    // POST /api/knowledge-base/search - Search across documents and FAQs
    router.post('/search', authenticateToken, async (req, res) => {
        try {
            const { query, type = 'all', limit = 20 } = req.body;
            
            if (!query || query.trim().length < 2) {
                return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
            }

            const searchResults = {
                documents: [],
                faqs: []
            };

            if (type === 'all' || type === 'documents') {
                // Search in documents
                const docSnapshot = await knowledgeBaseCollection
                    .where('status', '==', 'active')
                    .get();
                
                const allDocs = docSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at
                }));

                // Use RAG scoring for better search results
                const scoredDocs = allDocs.map(doc => ({
                    ...doc,
                    relevanceScore: ragProcessor.calculateRelevanceScore(query, doc)
                }))
                .filter(doc => doc.relevanceScore > 0)
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, limit);

                searchResults.documents = scoredDocs;
            }

            if (type === 'all' || type === 'faqs') {
                // Search in FAQs
                const faqSnapshot = await faqCollection
                    .where('status', '==', 'active')
                    .get();
                
                const allFaqs = faqSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at
                }));

                // Use RAG scoring for better search results
                const scoredFaqs = allFaqs.map(faq => ({
                    ...faq,
                    relevanceScore: ragProcessor.calculateRelevanceScore(query, faq)
                }))
                .filter(faq => faq.relevanceScore > 0)
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, limit);

                searchResults.faqs = scoredFaqs;
            }

            res.status(200).json(searchResults);
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            res.status(500).json({ error: 'Failed to search knowledge base' });
        }
    });

    // GET /api/knowledge-base/categories - Get all categories
    router.get('/categories', authenticateToken, async (req, res) => {
        try {
            const [docSnapshot, faqSnapshot] = await Promise.all([
                knowledgeBaseCollection.get(),
                faqCollection.get()
            ]);

            const categories = new Set();
            
            docSnapshot.docs.forEach(doc => {
                if (doc.data().category) {
                    categories.add(doc.data().category);
                }
            });

            faqSnapshot.docs.forEach(doc => {
                if (doc.data().category) {
                    categories.add(doc.data().category);
                }
            });

            res.status(200).json({
                categories: Array.from(categories).sort()
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    });

    // GET /api/knowledge-base/suggestions - Get search suggestions
    router.get('/suggestions', authenticateToken, async (req, res) => {
        try {
            const { q } = req.query;
            
            if (!q || q.length < 2) {
                return res.status(200).json({ suggestions: [] });
            }

            const [docSnapshot, faqSnapshot] = await Promise.all([
                knowledgeBaseCollection.where('status', '==', 'active').get(),
                faqCollection.where('status', '==', 'active').get()
            ]);

            const documents = docSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const faqs = faqSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const suggestions = ragProcessor.generateSearchSuggestions(documents, faqs, q);

            res.status(200).json({ suggestions });
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            res.status(500).json({ error: 'Failed to fetch suggestions' });
        }
    });

    return router;
};
