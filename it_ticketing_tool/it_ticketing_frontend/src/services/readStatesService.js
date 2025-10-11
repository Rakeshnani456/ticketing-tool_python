// Service for managing read states via API
import { authClient } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ReadStatesService {
  async getAuthToken() {
    const user = authClient.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  }

  async getReadStates() {
    try {
      const token = await this.getAuthToken();
      console.log('Fetching read states from API...');
      const response = await fetch(`${API_BASE_URL}/api/read-states`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data.readStates;
    } catch (error) {
      console.error('Error fetching read states:', error);
      // Return default state on error
      return {
        activities: [],
        tickets: [],
        showReadActivities: true,
        showReadTickets: true
      };
    }
  }

  async updateReadStates(readStates) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/read-states`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(readStates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.readStates;
    } catch (error) {
      console.error('Error updating read states:', error);
      throw error;
    }
  }

  async markActivityAsRead(activityId) {
    try {
      const token = await this.getAuthToken();
      console.log('API: Marking activity as read:', activityId);
      const response = await fetch(`${API_BASE_URL}/api/read-states/activities/${activityId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API: Mark activity response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API: Mark activity response data:', data);
      return data.readStates;
    } catch (error) {
      console.error('Error marking activity as read:', error);
      throw error;
    }
  }

  async markTicketAsRead(ticketId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/read-states/tickets/${ticketId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.readStates;
    } catch (error) {
      console.error('Error marking ticket as read:', error);
      throw error;
    }
  }

  async markActivityAsUnread(activityId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/read-states/activities/${activityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.readStates;
    } catch (error) {
      console.error('Error marking activity as unread:', error);
      throw error;
    }
  }

  async markTicketAsUnread(ticketId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/read-states/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.readStates;
    } catch (error) {
      console.error('Error marking ticket as unread:', error);
      throw error;
    }
  }
}

export default new ReadStatesService();
