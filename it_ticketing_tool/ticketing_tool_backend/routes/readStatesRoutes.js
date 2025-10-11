const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, authenticateToken) => {
    
    // Get user's read states
    router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Backend: Fetching read states for user:', userId);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('Backend: User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const readStates = userData.read_states || {
      activities: [],
      tickets: [],
      showReadActivities: true,
      showReadTickets: true
    };
    
    console.log('Backend: Returning read states:', readStates);
    res.status(200).json({ readStates });
  } catch (error) {
    console.error('Error fetching read states:', error);
    res.status(500).json({ error: 'Failed to fetch read states' });
  }
});

    // Update read states
    router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { activities, tickets, showReadActivities, showReadTickets } = req.body;
    
    const updateData = {
      read_states: {
        activities: activities || [],
        tickets: tickets || [],
        showReadActivities: showReadActivities !== undefined ? showReadActivities : true,
        showReadTickets: showReadTickets !== undefined ? showReadTickets : true,
        lastUpdated: new Date()
      }
    };
    
    await db.collection('users').doc(userId).update(updateData);
    
    res.status(200).json({ 
      message: 'Read states updated successfully',
      readStates: updateData.read_states
    });
  } catch (error) {
    console.error('Error updating read states:', error);
    res.status(500).json({ error: 'Failed to update read states' });
  }
});

    // Mark specific activity as read
    router.post('/activities/:activityId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { activityId } = req.params;
    
    console.log('Backend: Marking activity as read:', activityId, 'for user:', userId);
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('Backend: User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const readStates = userData.read_states || { activities: [], tickets: [], showReadActivities: true, showReadTickets: true };
    
    console.log('Backend: Current read states:', readStates);
    
    if (!readStates.activities.includes(activityId)) {
      readStates.activities.push(activityId);
      readStates.lastUpdated = new Date();
      
      console.log('Backend: Updating read states to:', readStates);
      await db.collection('users').doc(userId).update({ read_states: readStates });
    }
    
    console.log('Backend: Returning updated read states:', readStates);
    res.status(200).json({ 
      message: 'Activity marked as read',
      readStates
    });
  } catch (error) {
    console.error('Error marking activity as read:', error);
    res.status(500).json({ error: 'Failed to mark activity as read' });
  }
});

    // Mark specific ticket as read
    router.post('/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { ticketId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const readStates = userData.read_states || { activities: [], tickets: [], showReadActivities: true, showReadTickets: true };
    
    if (!readStates.tickets.includes(ticketId)) {
      readStates.tickets.push(ticketId);
      readStates.lastUpdated = new Date();
      
      await db.collection('users').doc(userId).update({ read_states: readStates });
    }
    
    res.status(200).json({ 
      message: 'Ticket marked as read',
      readStates
    });
  } catch (error) {
    console.error('Error marking ticket as read:', error);
    res.status(500).json({ error: 'Failed to mark ticket as read' });
  }
});

    // Remove activity from read list
    router.delete('/activities/:activityId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { activityId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const readStates = userData.read_states || { activities: [], tickets: [], showReadActivities: true, showReadTickets: true };
    
    readStates.activities = readStates.activities.filter(id => id !== activityId);
    readStates.lastUpdated = new Date();
    
    await db.collection('users').doc(userId).update({ read_states: readStates });
    
    res.status(200).json({ 
      message: 'Activity marked as unread',
      readStates
    });
  } catch (error) {
    console.error('Error marking activity as unread:', error);
    res.status(500).json({ error: 'Failed to mark activity as unread' });
  }
});

    // Remove ticket from read list
    router.delete('/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { ticketId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const readStates = userData.read_states || { activities: [], tickets: [], showReadActivities: true, showReadTickets: true };
    
    readStates.tickets = readStates.tickets.filter(id => id !== ticketId);
    readStates.lastUpdated = new Date();
    
    await db.collection('users').doc(userId).update({ read_states: readStates });
    
    res.status(200).json({ 
      message: 'Ticket marked as unread',
      readStates
    });
  } catch (error) {
    console.error('Error marking ticket as unread:', error);
    res.status(500).json({ error: 'Failed to mark ticket as unread' });
  }
});

    return router;
};
