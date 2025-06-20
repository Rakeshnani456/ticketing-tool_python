from flask import Flask, request, jsonify
from flask_cors import CORS # Import Flask-CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
from firebase_admin import exceptions # Import exceptions module for Firebase errors
# Removed: from google.cloud.firestore import Timestamp # Corrected import for Timestamp type - this import is not needed if to_dict() handles conversion
from datetime import datetime, timedelta, timezone # Import timezone for consistent datetimes

# Initialize the Flask application
app = Flask(__name__)
# Enable CORS for all routes, allowing requests from any origin (for development)
# In production, you would restrict this to your frontend's domain.
CORS(app) 

# --- Firebase Firestore & Auth Configuration ---
# IMPORTANT: Replace 'path/to/your/serviceAccountKey.json' with the actual path
# to the service account key file you downloaded from Firebase.
# This file must be in the same directory as app.py for this configuration.
# KEEP THIS FILE SECURE AND OUT OF VERSION CONTROL (e.g., .gitignore) IN PRODUCTION!
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json' # Make sure this file is present

# Initialize Firebase Admin SDK globally
db = None
users_collection = None
tickets_collection = None
db_connected = False # Flag to track database connection status

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client() # Get a Firestore client
    users_collection = db.collection('users') # Collection for user roles
    tickets_collection = db.collection('tickets') # Reference to your 'tickets' collection
    print("Connected to Firebase Firestore successfully!")
    db_connected = True
except Exception as e:
    print(f"Error connecting to Firebase Firestore: {e}")
    db_connected = False

# Helper function to convert Firestore Timestamp or datetime to ISO format string
def format_timestamp_for_json(timestamp):
    if isinstance(timestamp, datetime):
        # Ensure it's timezone-aware before converting, then convert to ISO format
        if timestamp.tzinfo is None:
            # If naive, assume UTC as per how we store it (good for consistent serialization)
            return timestamp.replace(tzinfo=timezone.utc).isoformat()
        return timestamp.isoformat()
    # Removed explicit check for `Timestamp` type as `doc.to_dict()` generally converts to `datetime`
    return timestamp # Return as is if not a recognized datetime/timestamp type

# Helper function to serialize ticket data to JSON format
def json_serializable_ticket(doc_id, ticket_data):
    # Convert all datetime/timestamp objects to ISO format strings
    # Create a copy to avoid modifying the original dict during iteration
    ticket_data_copy = ticket_data.copy()
    ticket_data_copy['id'] = doc_id
    
    if 'created_at' in ticket_data_copy:
        ticket_data_copy['created_at'] = format_timestamp_for_json(ticket_data_copy['created_at'])
    if 'updated_at' in ticket_data_copy:
        ticket_data_copy['updated_at'] = format_timestamp_for_json(ticket_data_copy['updated_at'])
    if 'due_date' in ticket_data_copy:
        ticket_data_copy['due_date'] = format_timestamp_for_json(ticket_data_copy['due_date'])
    
    # Process comments to ensure their timestamps are also ISO formatted
    if 'comments' in ticket_data_copy and isinstance(ticket_data_copy['comments'], list):
        ticket_data_copy['comments'] = [
            {
                'text': comment.get('text'),
                'commenter': comment.get('commenter'),
                'timestamp': format_timestamp_for_json(comment.get('timestamp'))
            }
            for comment in ticket_data_copy['comments']
        ]
    return ticket_data_copy

# API endpoint for user login (now expecting ID Token)
@app.route('/api/login', methods=['POST'])
def api_login():
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    id_token = data.get('idToken') # Expecting Firebase ID Token from client

    if not id_token:
        return jsonify({'error': 'Firebase ID Token is missing.'}), 400

    try:
        # Verify the ID token using the Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        user_email = decoded_token['email']

        # Retrieve user role from Firestore based on the UID
        user_doc = users_collection.document(uid).get()
        if not user_doc.exists:
            # This case might occur if user was created via Firebase Auth but role not saved in Firestore
            # Consider creating a default user entry here if this is an expected flow.
            print(f"Warning: User {user_email} (UID: {uid}) authenticated but profile not found in Firestore. Creating default profile.")
            users_collection.document(uid).set({'email': user_email, 'role': 'user'}) # Assign default role
            user_role = 'user'
        else:
            user_profile = user_doc.to_dict()
            user_role = user_profile.get('role', 'user') # Default to 'user' if not set

        # Return user info to frontend
        return jsonify({
            'message': 'Login successful!',
            'user': {'id': uid, 'email': user_email, 'role': user_role}
        }), 200

    except exceptions.FirebaseError as e:
        print(f"Firebase token verification error: {e}")
        return jsonify({'error': f'Authentication failed: {e.code.replace("_", " ").title()}'}), 401
    except Exception as e:
        print(f"Unexpected error during token authentication: {e}")
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500

# API endpoint for user registration
@app.route('/api/register', methods=['POST'])
def api_register():
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password') # Password is used here for direct creation
    role = data.get('role', 'user') # Role is passed from React

    # If the React frontend already handled Firebase Auth creation, it might send a token
    id_token = data.get('idToken')
    if id_token:
        try:
            # Verify the ID token to get the UID, ensuring the user was actually created by Firebase Auth.
            # This also implicitly validates the email from the token.
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            # Store user role in Firestore 'users' collection
            users_collection.document(uid).set({'email': email, 'role': role}, merge=True) # Use merge to avoid overwriting if doc exists
            return jsonify({'message': f'User {email} registered and profile created successfully!'}), 201
        except exceptions.FirebaseError as e:
            print(f"Firebase token verification error during registration: {e}")
            return jsonify({'error': f'Registration failed: {e.code.replace("_", " ").title()}'}), 400
        except Exception as e:
            print(f"Unexpected error during registration: {e}")
            return jsonify({'error': f'An unexpected error occurred during registration: {e}'}), 500
    
    # Fallback/Alternative: Flask creates user in Firebase Auth if no token provided (less common for React apps)
    if not email or not password:
        return jsonify({'error': 'Email and Password are required!'}), 400
    try:
        user = auth.create_user(email=email, password=password)
        users_collection.document(user.uid).set({'email': email, 'role': role})
        return jsonify({'message': f'User {email} registered successfully!'}), 201
    except auth.EmailAlreadyExistsError:
        return jsonify({'error': 'Email already registered.'}), 409
    except exceptions.FirebaseError as e:
        return jsonify({'error': f'Firebase error during registration: {e.code.replace("_", " ").title()}'}), 400
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500
    
# API endpoint for user logout
@app.route('/api/logout', methods=['POST'])
def api_logout():
    # For a stateless API, usually clearing client-side storage is enough.
    # If you were using server-side sessions, you'd clear them here.
    # Since React handles localStorage, this endpoint is mainly for completeness
    # or if you introduce server-side sessions later.
    return jsonify({'message': 'Logged out successfully (client-side session cleared).'}), 200


# API endpoint to create a new ticket
@app.route('/api/tickets', methods=['POST'])
def create_ticket_api():
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    reporter = data.get('reporter')
    status = data.get('status', 'Open')
    priority = data.get('priority', 'Low')
    assigned_to_email = data.get('assigned_to_email', '')
    due_date_str = data.get('due_date')
    creator_uid = data.get('creator_uid')
    creator_email = data.get('creator_email')

    if not all([title, description, reporter, creator_uid, creator_email]):
        return jsonify({'error': 'Title, Description, Reporter, Creator UID, and Creator Email are required!'}), 400

    due_date_obj = None
    if due_date_str:
        try:
            # Assume McNamara-MM-DD format from React's input type="date"
            due_date_obj = datetime.strptime(due_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except ValueError:
            return jsonify({'error': 'Invalid due date format. Please use YYYY-MM-DD.'}), 400
    else:
        # Default due_date to 10 days from now if not provided
        due_date_obj = datetime.now(timezone.utc) + timedelta(days=10)


    try:
        new_ticket_data = {
            "title": title,
            "description": description,
            "status": status,
            "priority": priority,
            "reporter": reporter,
            "creator_uid": creator_uid,
            "creator_email": creator_email,
            "assigned_to_email": assigned_to_email,
            "due_date": due_date_obj,
            "comments": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        # For add(), doc_ref is a tuple (update_time, DocumentReference)
        # We need doc_ref[1].id for the ID
        update_time, doc_ref = tickets_collection.add(new_ticket_data) 
        return jsonify({'message': 'Ticket created successfully!', 'id': doc_ref.id}), 201
    except Exception as e:
        print(f"Error creating ticket: {e}")
        return jsonify({'error': f'Failed to create ticket: {str(e)}'}), 500

# API endpoint to get all tickets (for support associate)
@app.route('/tickets/all', methods=['GET'])
def get_all_tickets_api():
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500
    
    # You might want to add authentication/authorization here
    # E.g., check if the user requesting this is a 'support' role
    # For now, assuming client-side check is sufficient as per App.js

    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')
    due_filter = request.args.get('due')
    user_email = request.args.get('userEmail') # Assuming React sends userEmail for 'assigned_to_me' filter in support view


    tickets = []
    counts = {
        'open_tickets': 0, 'assigned_to_me': 0, 'assigned_to_others': 0,
        'unassigned': 0, 'overdue': 0, 'closed_tickets': 0, 'total_tickets': 0
    }

    try:
        query_ref = tickets_collection.order_by('created_at', direction=firestore.Query.DESCENDING)
        
        # Fetch all documents first to iterate and filter in Python due to Firestore query limitations
        all_docs = list(query_ref.stream())
        all_fetched_tickets_data = [doc.to_dict() for doc in all_docs] # Get data part
        
        now = datetime.now(timezone.utc) # Use timezone-aware datetime for comparison

        for i, ticket_data in enumerate(all_fetched_tickets_data):
            # Always increment total for count
            counts['total_tickets'] += 1

            # Calculate counts based on current state of all tickets, irrespective of current view's filters
            if ticket_data.get('status') not in ['Closed', 'Resolved']:
                counts['open_tickets'] += 1
            if ticket_data.get('status') == 'Closed':
                counts['closed_tickets'] += 1
            if ticket_data.get('assigned_to_email') == user_email: # Compare with the email passed for support user
                counts['assigned_to_me'] += 1
            if not ticket_data.get('assigned_to_email'):
                counts['unassigned'] += 1
            if ticket_data.get('assigned_to_email') and ticket_data.get('assigned_to_email') != user_email:
                counts['assigned_to_others'] += 1
            
            due_date = ticket_data.get('due_date')
            # Use a tuple for isinstance to check against multiple types
            if isinstance(due_date, datetime): # Now only checking for datetime
                # Convert to datetime object if it's a Firestore Timestamp, ensure timezone-awareness
                due_date_dt = due_date.astimezone(timezone.utc) if due_date.tzinfo is None else due_date
                if due_date_dt < now:
                    counts['overdue'] += 1

            # Now apply display filters for the list to be returned
            keep_ticket = True
            if status_filter and ticket_data.get('status') != status_filter:
                keep_ticket = False
            
            if keep_ticket and assignment_filter:
                if assignment_filter == 'assigned_to_me':
                    if ticket_data.get('assigned_to_email') != user_email:
                        keep_ticket = False
                elif assignment_filter == 'unassigned':
                    if ticket_data.get('assigned_to_email'):
                        keep_ticket = False
                elif assignment_filter == 'assigned_to_others':
                    if not (ticket_data.get('assigned_to_email') and ticket_data.get('assigned_to_email') != user_email):
                        keep_ticket = False
            
            if keep_ticket and due_filter == 'overdue':
                due_date_dt = None
                due_date = ticket_data.get('due_date')
                # Use a tuple for isinstance to check against multiple types
                if isinstance(due_date, datetime): # Now only checking for datetime
                    due_date_dt = due_date.astimezone(timezone.utc) if due_date.tzinfo is None else due_date
                
                if not due_date_dt or due_date_dt >= now: # If no due date or not overdue
                    keep_ticket = False

            if keep_ticket:
                # Add doc_id (name) back to the dictionary for React
                tickets.append(json_serializable_ticket(all_docs[i].id, all_fetched_tickets_data[i])) # Ensure consistent serialization, pass original data for copy
                
        return jsonify({'tickets': tickets, 'counts': counts}), 200
    except Exception as e:
        print(f"Error fetching all tickets: {e}")
        return jsonify({'error': f'Failed to fetch all tickets: {str(e)}'}), 500


# API endpoint to get tickets for the logged-in user
@app.route('/tickets/my', methods=['GET'])
def get_my_tickets_api():
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    user_id = request.args.get('userId') # Get user ID from query parameter from React
    if not user_id:
        return jsonify({'error': 'User ID is required to fetch your tickets.'}), 400

    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')
    due_filter = request.args.get('due')
    user_email = request.args.get('userEmail') # Also get user email for filtering 'assigned_to_me' within My Tickets


    tickets = []
    counts = {
        'open_tickets': 0, 'assigned_to_me': 0, 'assigned_to_others': 0,
        'unassigned': 0, 'overdue': 0, 'closed_tickets': 0, 'total_tickets': 0
    }

    try:
        # Base query for 'My Tickets'
        query_ref = tickets_collection.where('creator_uid', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING)
        
        # Fetch all documents first to iterate and filter in Python due to Firestore query limitations
        all_docs = list(query_ref.stream())
        all_fetched_tickets_data = [doc.to_dict() for doc in all_docs] # Get data part

        now = datetime.now(timezone.utc) # Use timezone-aware datetime for comparison

        for i, ticket_data in enumerate(all_fetched_tickets_data):
            # Always increment total for count
            counts['total_tickets'] += 1

            # Calculate counts based on current state of all tickets, irrespective of current view's filters
            if ticket_data.get('status') not in ['Closed', 'Resolved']:
                counts['open_tickets'] += 1
            if ticket_data.get('status') == 'Closed':
                counts['closed_tickets'] += 1
            if ticket_data.get('assigned_to_email') == user_email:
                counts['assigned_to_me'] += 1
            if not ticket_data.get('assigned_to_email'):
                counts['unassigned'] += 1
            if ticket_data.get('assigned_to_email') and ticket_data.get('assigned_to_email') != user_email:
                counts['assigned_to_others'] += 1
            
            due_date = ticket_data.get('due_date')
            # Use a tuple for isinstance to check against multiple types
            if isinstance(due_date, datetime): # Now only checking for datetime
                due_date_dt = due_date.astimezone(timezone.utc) if due_date.tzinfo is None else due_date
                if due_date_dt < now:
                    counts['overdue'] += 1

            # Now apply display filters for the list to be returned
            keep_ticket = True
            if status_filter and ticket_data.get('status') != status_filter:
                keep_ticket = False
            
            if keep_ticket and assignment_filter:
                if assignment_filter == 'assigned_to_me':
                    if ticket_data.get('assigned_to_email') != user_email:
                        keep_ticket = False
                elif assignment_filter == 'unassigned':
                    if ticket_data.get('assigned_to_email'):
                        keep_ticket = False
                elif assignment_filter == 'assigned_to_others':
                    if not (ticket_data.get('assigned_to_email') and ticket_data.get('assigned_to_email') != user_email):
                        keep_ticket = False
            
            if keep_ticket and due_filter == 'overdue':
                due_date_dt = None
                due_date = ticket_data.get('due_date')
                # Use a tuple for isinstance to check against multiple types
                if isinstance(due_date, datetime): # Now only checking for datetime
                    due_date_dt = due_date.astimezone(timezone.utc) if due_date.tzinfo is None else due_date
                
                if not due_date_dt or due_date_dt >= now: # If no due date or not overdue
                    keep_ticket = False

            if keep_ticket:
                # Add doc_id (name) back to the dictionary for React
                tickets.append(json_serializable_ticket(all_docs[i].id, all_fetched_tickets_data[i])) # Ensure consistent serialization, pass original data for copy
                
        return jsonify({'tickets': tickets, 'counts': counts}), 200
    except Exception as e:
        print(f"Error fetching my tickets: {e}")
        return jsonify({'error': f'Failed to fetch your tickets: {str(e)}'}), 500


# API endpoint to get a single ticket's details
@app.route('/api/tickets/<string:ticket_id>', methods=['GET'])
def get_ticket_detail_api(ticket_id):
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    try:
        ticket_doc = tickets_collection.document(ticket_id).get()
        if not ticket_doc.exists:
            return jsonify({'error': 'Ticket not found!'}), 404

        ticket_data = ticket_doc.to_dict()
        # Ensure it's JSON serializable, especially timestamps
        serializable_ticket = json_serializable_ticket(ticket_doc.id, ticket_data)
        
        return jsonify(serializable_ticket), 200
    except Exception as e:
        print(f"Error retrieving ticket detail: {e}")
        return jsonify({'error': f'Failed to retrieve ticket details: {str(e)}'}), 500

# API endpoint to update a ticket
@app.route('/api/tickets/<string:ticket_id>', methods=['PUT'])
def update_ticket_api(ticket_id):
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    
    update_fields = {
        "updated_at": datetime.now(timezone.utc) # Always update timestamp on change
    }

    # Only update fields if they are present in the request JSON
    if 'status' in data:
        update_fields['status'] = data['status']
    if 'priority' in data:
        update_fields['priority'] = data['priority']
    if 'assigned_to_email' in data:
        update_fields['assigned_to_email'] = data['assigned_to_email']
    
    # Handle due_date
    if 'due_date' in data:
        due_date_str = data['due_date']
        if due_date_str: # If a date string is provided, parse it
            try:
                update_fields['due_date'] = datetime.strptime(due_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except ValueError:
                return jsonify({'error': 'Invalid Due Date format. Please use YYYY-MM-DD.'}), 400
        else: # If an empty string is provided, set to None
            update_fields['due_date'] = None

    try:
        tickets_collection.document(ticket_id).update(update_fields)
        return jsonify({"message": "Ticket updated successfully!"}), 200
    except Exception as e:
        print(f"Error updating ticket: {e}")
        return jsonify({"error": f"Failed to update ticket: {str(e)}"}), 500

@app.route('/api/tickets/<string:ticket_id>/comments', methods=['POST'])
def add_comment_api(ticket_id):
    if not db_connected:
        return jsonify({"error": "Database not connected."}), 500

    data = request.json
    comment_text = data.get('comment_text')
    commenter_name = data.get('commenter_name', 'Anonymous') # React will send user.email

    if not comment_text:
        return jsonify({"error": "Comment text cannot be empty."}), 400

    new_comment = {
        'text': comment_text,
        'commenter': commenter_name,
        'timestamp': datetime.now(timezone.utc)
    }

    try:
        tickets_collection.document(ticket_id).update({
            "comments": firestore.ArrayUnion([new_comment]),
            "updated_at": datetime.now(timezone.utc)
        })
        return jsonify({"message": "Comment added successfully!"}), 200
    except Exception as e:
        print(f"Error adding comment: {e}")
        return jsonify({"error": f"Failed to add comment: {str(e)}"}), 500

# Entry point for running the Flask app
if __name__ == '__main__':
    app.run(debug=True)
