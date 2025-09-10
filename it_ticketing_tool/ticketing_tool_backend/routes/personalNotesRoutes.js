// routes/personalNotesRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, authenticateToken, checkRole, jsonSerializableNotification) => {
    
    // --- Get Personal Notes for User ---
    router.get('/', authenticateToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            return res.status(200).json({ notes: personalNotes });
        } catch (error) {
            console.error(`Error fetching my notes: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch my notes: ${error.message}` });
        }
    });
    
    // --- Add Personal Note ---
    router.post('/', authenticateToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const { title, content, category = 'general' } = req.body;
        
        if (!title || !content || title.trim() === '' || content.trim() === '') {
            return res.status(400).json({ error: 'Title and content are required!' });
        }
        
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            const newNote = {
                id: admin.firestore().collection('temp').doc().id, // Generate a unique ID
                title: title.trim(),
                content: content.trim(),
                category: category,
                created_at: new Date(),
                updated_at: new Date(),
                is_pinned: false
            };
            
            personalNotes.push(newNote);
            
            await usersCollection.doc(userId).update({
                personal_notes: personalNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return res.status(201).json({ 
                message: 'Personal note added successfully!', 
                note: newNote 
            });
        } catch (error) {
            console.error(`Error adding personal note: ${error.message}`);
            return res.status(500).json({ error: `Failed to add personal note: ${error.message}` });
        }
    });
    
    // --- Update Personal Note ---
    router.put('/:noteId', authenticateToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        const { title, content, category, is_pinned } = req.body;
        
        if (!title || !content || title.trim() === '' || content.trim() === '') {
            return res.status(400).json({ error: 'Title and content are required!' });
        }
        
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            const noteIndex = personalNotes.findIndex(note => note.id === noteId);
            if (noteIndex === -1) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            const updatedNote = {
                ...personalNotes[noteIndex],
                title: title.trim(),
                content: content.trim(),
                category: category || personalNotes[noteIndex].category,
                is_pinned: is_pinned !== undefined ? is_pinned : personalNotes[noteIndex].is_pinned,
                updated_at: new Date()
            };
            
            personalNotes[noteIndex] = updatedNote;
            
            await usersCollection.doc(userId).update({
                personal_notes: personalNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
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
    router.delete('/:noteId', authenticateToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            const noteIndex = personalNotes.findIndex(note => note.id === noteId);
            if (noteIndex === -1) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            personalNotes.splice(noteIndex, 1);
            
            await usersCollection.doc(userId).update({
                personal_notes: personalNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return res.status(200).json({ message: 'Personal note deleted successfully!' });
        } catch (error) {
            console.error(`Error deleting personal note: ${error.message}`);
            return res.status(500).json({ error: `Failed to delete personal note: ${error.message}` });
        }
    });
    
    // --- Toggle Pin Status ---
    router.patch('/:noteId/pin', authenticateToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userId = req.user.uid;
        const noteId = req.params.noteId;
        
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            const noteIndex = personalNotes.findIndex(note => note.id === noteId);
            if (noteIndex === -1) {
                return res.status(404).json({ error: 'Note not found!' });
            }
            
            personalNotes[noteIndex].is_pinned = !personalNotes[noteIndex].is_pinned;
            personalNotes[noteIndex].updated_at = new Date();
            
            await usersCollection.doc(userId).update({
                personal_notes: personalNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return res.status(200).json({ 
                message: 'Pin status updated successfully!', 
                note: personalNotes[noteIndex] 
            });
        } catch (error) {
            console.error(`Error toggling pin status: ${error.message}`);
            return res.status(500).json({ error: `Failed to toggle pin status: ${error.message}` });
        }
    });
    
    return router;
};
