// routes/personalNotesRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, authenticateToken, checkRole, jsonSerializableNotification) => {
    
    // Create a separate collection for personal notes for better performance
    const personalNotesCollection = db.collection('personal_notes');
    
    // --- Get Personal Notes for User ---
    router.get('/', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        
        try {
            // Query personal notes collection directly with proper indexing
            const notesQuery = personalNotesCollection
                .where('user_id', '==', userId)
                .orderBy('updated_at', 'desc')
                .limit(100); // Add limit for performance
            
            const notesSnapshot = await notesQuery.get();
            const personalNotes = [];
            
            notesSnapshot.forEach(doc => {
                personalNotes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return res.status(200).json({ notes: personalNotes });
        } catch (error) {
            console.error(`Error fetching my notes: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch my notes: ${error.message}` });
        }
    });
    
    // --- Get Single Personal Note ---
    router.get('/:noteId', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        
        try {
            // Query the specific note directly from the collection
            const noteDoc = await personalNotesCollection.doc(noteId).get();
            
            if (!noteDoc.exists) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            const noteData = noteDoc.data();
            
            // Verify the note belongs to the user
            if (noteData.user_id !== userId) {
                return res.status(403).json({ error: 'Access denied!' });
            }
            
            return res.status(200).json({ note: { id: noteDoc.id, ...noteData } });
        } catch (error) {
            console.error(`Error fetching note: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch note: ${error.message}` });
        }
    });
    
    // --- Add Personal Note ---
    router.post('/', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const { title, content, category = 'general' } = req.body;
        
        if (!title || !content || title.trim() === '' || content.trim() === '') {
            return res.status(400).json({ error: 'Title and content are required!' });
        }
        
        try {
            // Create note directly in the personal_notes collection
            const newNote = {
                user_id: userId,
                title: title.trim(),
                content: content.trim(),
                category: category,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                is_pinned: false
            };
            
            const noteRef = await personalNotesCollection.add(newNote);
            
            // Return the note with the generated ID
            const createdNote = {
                id: noteRef.id,
                ...newNote,
                created_at: new Date(),
                updated_at: new Date()
            };
            
            return res.status(201).json({ 
                message: 'Personal note added successfully!', 
                note: createdNote 
            });
        } catch (error) {
            console.error(`Error adding personal note: ${error.message}`);
            return res.status(500).json({ error: `Failed to add personal note: ${error.message}` });
        }
    });
    
    // --- Update Personal Note ---
    router.put('/:noteId', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        const { title, content, category, is_pinned } = req.body;
        
        if (!title || !content || title.trim() === '' || content.trim() === '') {
            return res.status(400).json({ error: 'Title and content are required!' });
        }
        
        try {
            // Check if note exists and belongs to user
            const noteDoc = await personalNotesCollection.doc(noteId).get();
            if (!noteDoc.exists) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            const noteData = noteDoc.data();
            if (noteData.user_id !== userId) {
                return res.status(403).json({ error: 'Access denied!' });
            }
            
            // Update the note directly
            const updateData = {
                title: title.trim(),
                content: content.trim(),
                category: category || noteData.category,
                is_pinned: is_pinned !== undefined ? is_pinned : noteData.is_pinned,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await personalNotesCollection.doc(noteId).update(updateData);
            
            const updatedNote = {
                id: noteId,
                ...noteData,
                ...updateData,
                updated_at: new Date()
            };
            
            return res.status(200).json({ 
                message: 'Personal note updated successfully!', 
                note: updatedNote 
            });
        } catch (error) {
            console.error(`Error updating personal note: ${error.message}`);
            return res.status(500).json({ error: `Failed to update personal note: ${error.message}` });
        }
    });
    
    // --- Delete Personal Note ---
    router.delete('/:noteId', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        
        try {
            // Check if note exists and belongs to user
            const noteDoc = await personalNotesCollection.doc(noteId).get();
            if (!noteDoc.exists) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            const noteData = noteDoc.data();
            if (noteData.user_id !== userId) {
                return res.status(403).json({ error: 'Access denied!' });
            }
            
            // Delete the note directly
            await personalNotesCollection.doc(noteId).delete();
            
            return res.status(200).json({ message: 'Personal note deleted successfully!' });
        } catch (error) {
            console.error(`Error deleting personal note: ${error.message}`);
            return res.status(500).json({ error: `Failed to delete personal note: ${error.message}` });
        }
    });
    
    // --- Toggle Pin Status ---
    router.patch('/:noteId/pin', authenticateToken, checkRole(['user', 'support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        
        try {
            // Check if note exists and belongs to user
            const noteDoc = await personalNotesCollection.doc(noteId).get();
            if (!noteDoc.exists) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            const noteData = noteDoc.data();
            if (noteData.user_id !== userId) {
                return res.status(403).json({ error: 'Access denied!' });
            }
            
            // Toggle pin status and update
            const newPinStatus = !noteData.is_pinned;
            await personalNotesCollection.doc(noteId).update({
                is_pinned: newPinStatus,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            const updatedNote = {
                id: noteId,
                ...noteData,
                is_pinned: newPinStatus,
                updated_at: new Date()
            };
            
            return res.status(200).json({ 
                message: 'Pin status updated successfully!', 
                note: updatedNote 
            });
        } catch (error) {
            console.error(`Error toggling pin status: ${error.message}`);
            return res.status(500).json({ error: `Failed to toggle pin status: ${error.message}` });
        }
    });
    
    return router;
};
