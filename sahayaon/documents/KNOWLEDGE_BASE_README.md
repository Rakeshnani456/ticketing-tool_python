# Knowledge Base Feature

This document describes the Knowledge Base feature added to Sahayaon, which provides document management, FAQ system, and RAG (Retrieval Augmented Generation) processing capabilities.

## Features

### 1. Document Management
- **Create Documents**: Add new knowledge base documents with rich text content
- **Upload Documents**: Support for PDF, TXT, DOC, DOCX, and MD file uploads
- **Document Categories**: Organize documents by categories
- **Tags System**: Tag documents for better organization and searchability
- **Public/Private Documents**: Control document visibility
- **Document Search**: Full-text search across document content

### 2. FAQ Management
- **Create FAQs**: Add frequently asked questions and answers
- **FAQ Categories**: Organize FAQs by categories
- **FAQ Search**: Search through questions and answers
- **Public/Private FAQs**: Control FAQ visibility

### 3. RAG Processing
- **Automatic Keyword Extraction**: Extract relevant keywords from content
- **Content Summarization**: Generate automatic summaries
- **Entity Extraction**: Extract emails, URLs, phone numbers, and dates
- **Relevance Scoring**: Intelligent search result ranking
- **Search Suggestions**: Provide search suggestions based on content

### 4. Search Functionality
- **Unified Search**: Search across both documents and FAQs
- **RAG-Enhanced Search**: Use RAG processing for better search results
- **Category Filtering**: Filter results by category
- **Relevance Scoring**: Results ranked by relevance to search query

## API Endpoints

### Documents
- `GET /api/knowledge-base/documents` - List all documents
- `GET /api/knowledge-base/documents/:id` - Get specific document
- `POST /api/knowledge-base/documents` - Create new document
- `POST /api/knowledge-base/documents/upload` - Upload document file
- `PUT /api/knowledge-base/documents/:id` - Update document
- `DELETE /api/knowledge-base/documents/:id` - Delete document

### FAQs
- `GET /api/knowledge-base/faqs` - List all FAQs
- `POST /api/knowledge-base/faqs` - Create new FAQ
- `PUT /api/knowledge-base/faqs/:id` - Update FAQ
- `DELETE /api/knowledge-base/faqs/:id` - Delete FAQ

### Search & Categories
- `POST /api/knowledge-base/search` - Search across documents and FAQs
- `GET /api/knowledge-base/categories` - Get all categories
- `GET /api/knowledge-base/suggestions` - Get search suggestions

## Database Schema

### Knowledge Base Collection (`knowledge_base`)
```javascript
{
  id: "document_id",
  title: "Document Title",
  content: "Document content...",
  category: "General",
  tags: ["tag1", "tag2"],
  isPublic: false,
  created_by: "user_uid",
  created_by_email: "user@example.com",
  created_at: "timestamp",
  updated_at: "timestamp",
  view_count: 0,
  status: "active",
  // RAG processed data
  summary: "Auto-generated summary...",
  keywords: ["keyword1", "keyword2"],
  word_count: 150,
  processed_content: "processed content...",
  entities: {
    emails: ["email@example.com"],
    urls: ["https://example.com"],
    phoneNumbers: ["123-456-7890"],
    dates: ["2024-01-01"]
  },
  // File upload data (if applicable)
  file_path: "/path/to/file",
  file_name: "original_filename.pdf",
  file_type: "application/pdf"
}
```

### FAQs Collection (`faqs`)
```javascript
{
  id: "faq_id",
  question: "What is...?",
  answer: "The answer is...",
  category: "General",
  tags: ["tag1", "tag2"],
  isPublic: false,
  created_by: "user_uid",
  created_by_email: "user@example.com",
  created_at: "timestamp",
  updated_at: "timestamp",
  view_count: 0,
  status: "active",
  // RAG processed data
  summary: "Auto-generated summary...",
  keywords: ["keyword1", "keyword2"],
  word_count: 50,
  processed_content: "processed content...",
  entities: {
    emails: [],
    urls: [],
    phoneNumbers: [],
    dates: []
  }
}
```

## RAG Processing

The RAG processor provides the following capabilities:

### Keyword Extraction
- Removes stop words
- Counts word frequency
- Extracts top relevant keywords

### Content Summarization
- Splits content into sentences
- Scores sentences based on word frequency
- Returns top-scoring sentences as summary

### Entity Extraction
- Extracts email addresses
- Extracts URLs
- Extracts phone numbers
- Extracts dates

### Relevance Scoring
- Scores documents based on title matches (weight: 3)
- Scores documents based on keyword matches (weight: 2)
- Scores documents based on content matches (weight: 1)
- Returns results sorted by relevance score

## File Upload Support

### Supported File Types
- **PDF**: `.pdf` (basic support, content extraction placeholder)
- **Text**: `.txt` (full support)
- **Markdown**: `.md` (full support)
- **Word**: `.doc`, `.docx` (basic support, content extraction placeholder)

### File Processing
- Files are stored in `uploads/knowledge-base/` directory
- Unique filenames generated using UUID
- File size limit: 10MB
- Content extraction based on file type

## Frontend Components

### KnowledgeBaseComponent
Main component providing:
- Tabbed interface for documents and FAQs
- Search functionality
- Document/FAQ creation and management
- Category filtering
- Responsive design

### Document Management
- Create documents with rich text
- Upload document files
- Edit and delete documents
- View document details

### FAQ Management
- Create FAQs with questions and answers
- Edit and delete FAQs
- View FAQ details

## Permissions

### Document/FAQ Management
- **Admin**: Full access to create, edit, delete
- **Support**: Full access to create, edit, delete
- **Super Admin**: Full access to create, edit, delete
- **Users**: Read-only access

### Public vs Private
- **Public**: Visible to all users
- **Private**: Visible only to users with management permissions

## Usage Examples

### Creating a Document
1. Navigate to Knowledge Base
2. Click "Create Document"
3. Fill in title, content, category, and tags
4. Set public/private visibility
5. Save document

### Uploading a Document
1. Navigate to Knowledge Base
2. Click "Upload Document"
3. Select file (PDF, TXT, DOC, DOCX, MD)
4. Fill in metadata (title, category, tags)
5. Upload document

### Creating an FAQ
1. Navigate to Knowledge Base
2. Click "Add FAQ"
3. Fill in question and answer
4. Set category and tags
5. Set public/private visibility
6. Save FAQ

### Searching
1. Use the search bar to enter query
2. Results are automatically ranked by relevance
3. Filter by category if needed
4. Switch between documents and FAQs tabs

## Future Enhancements

### Planned Features
- **Advanced RAG**: Integration with external AI services
- **PDF Processing**: Full PDF text extraction
- **Word Processing**: Full Word document processing
- **Version Control**: Document versioning
- **Collaboration**: Multi-user editing
- **Analytics**: Usage statistics and insights
- **Export**: Export documents and FAQs
- **Import**: Bulk import from external sources

### RAG Improvements
- **Vector Embeddings**: Use vector databases for semantic search
- **AI Integration**: Connect with OpenAI, Claude, or other AI services
- **Advanced NLP**: More sophisticated text processing
- **Machine Learning**: Learn from user interactions

## Technical Notes

### Dependencies
- **Backend**: `multer`, `uuid`, `fs`
- **Frontend**: React, Lucide React icons
- **Database**: Firebase Firestore

### File Storage
- Files stored locally in `uploads/knowledge-base/`
- Consider cloud storage for production (AWS S3, Google Cloud Storage)

### Performance
- RAG processing is synchronous (consider async for large documents)
- Search results are limited to prevent performance issues
- Consider implementing caching for frequently accessed content

## Troubleshooting

### Common Issues
1. **File Upload Fails**: Check file size (max 10MB) and file type
2. **Search Returns No Results**: Ensure content is properly processed
3. **Permission Denied**: Check user role and document visibility settings
4. **RAG Processing Errors**: Check file content and format

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in environment variables.

