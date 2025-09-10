// Test script for Notes API endpoints
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000';

// Test data
const testTicketId = 'test-ticket-id'; // Replace with actual ticket ID
const testNote = {
    note_text: 'This is a test internal note',
    note_type: 'internal'
};

async function testNotesAPI() {
    console.log('Testing Notes API endpoints...\n');

    try {
        // Test 1: Add Note
        console.log('1. Testing Add Note endpoint...');
        const addResponse = await fetch(`${API_BASE_URL}/api/tickets/${testTicketId}/add_note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: In real test, you'd need a valid Firebase token
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify(testNote)
        });

        console.log(`Add Note Response Status: ${addResponse.status}`);
        const addData = await addResponse.json();
        console.log('Add Note Response:', addData);
        console.log('');

        // Test 2: Update Note (if note was added successfully)
        if (addResponse.ok) {
            console.log('2. Testing Update Note endpoint...');
            const updateResponse = await fetch(`${API_BASE_URL}/api/tickets/${testTicketId}/notes/0`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({
                    note_text: 'Updated test internal note',
                    note_type: 'technical'
                })
            });

            console.log(`Update Note Response Status: ${updateResponse.status}`);
            const updateData = await updateResponse.json();
            console.log('Update Note Response:', updateData);
            console.log('');

            // Test 3: Delete Note
            console.log('3. Testing Delete Note endpoint...');
            const deleteResponse = await fetch(`${API_BASE_URL}/api/tickets/${testTicketId}/notes/0`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });

            console.log(`Delete Note Response Status: ${deleteResponse.status}`);
            const deleteData = await deleteResponse.json();
            console.log('Delete Note Response:', deleteData);
        }

    } catch (error) {
        console.error('Error testing Notes API:', error);
    }
}

// Run the test
testNotesAPI();
