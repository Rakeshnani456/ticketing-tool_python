from flask import Flask, request, jsonify
from flask_cors import CORS # Import Flask-CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timezone # Import timezone for consistent datetimes

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
    # In a production app, you'd want more robust error handling here.

def json_serializable_ticket(doc_id, ticket_data):
    """
    Helper function to convert Firestore document data (including datetime objects)
    into a JSON-serializable dictionary.
    Adds the document ID as 'id'.
    """
    if ticket_data:
        ticket_data['id'] = doc_id # Add the document ID to the dictionary
        if 'created_at' in ticket_data and isinstance(ticket_data['created_at'], datetime):
            ticket_data['created_at'] = ticket_data['created_at'].isoformat()
        if 'updated_at' in ticket_data and isinstance(ticket_data['updated_at'], datetime):
            ticket_data['updated_at'] = ticket_data['updated_at'].isoformat()
        if 'due_date' in ticket_data and isinstance(ticket_data['due_date'], datetime):
            ticket_data['due_date'] = ticket_data['due_date'].isoformat()
        if 'comments' in ticket_data and isinstance(ticket_data['comments'], list):
            for comment in ticket_data['comments']:
                if 'timestamp' in comment and isinstance(comment['timestamp'], datetime):
                    comment['timestamp'] = comment['timestamp'].isoformat()
    return ticket_data

@app.route('/register', methods=['POST'])
def register():
    """
    API endpoint for user registration using Firebase Authentication.
    Stores user role in Firestore.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')

    if not email or not password:
        return jsonify({'error': 'Email and password are required!'}), 400

    if role not in ['user', 'support']:
        return jsonify({'error': 'Invalid role specified.'}), 400

    try:
        # Create user in Firebase Authentication
        user = auth.create_user(email=email, password=password)

        # Store user role in Firestore 'users' collection
        users_collection.document(user.uid).set({'email': email, 'role': role})

        return jsonify({'message': f'User {email} registered successfully!', 'user_id': user.uid}), 201
    except firebase_admin.auth.EmailAlreadyExistsError:
        return jsonify({'error': 'Email already registered.'}), 409
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': f'Error registering user: {e}'}), 500

@app.route('/login', methods=['POST'])
def login():
    """
    API endpoint for user login.
    NOTE: This is a SIMPLIFIED login for demonstration ONLY.
    In production, use client-side Firebase SDK to sign in and send ID token to backend for verification.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password') # Password is not directly verified by Admin SDK here

    if not email or not password:
        return jsonify({'error': 'Email and Password are required!'}), 400

    try:
        # Attempt to get user by email. This confirms existence but doesn't authenticate password.
        # THIS IS INSECURE FOR PASSWORD VERIFICATION.
        # A proper flow involves Firebase client SDK for auth and token verification on backend.
        user_record = auth.get_user_by_email(email)

        # Retrieve user role from Firestore based on the UID found
        user_doc = users_collection.document(user_record.uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found in database. Contact support.'}), 404
        
        user_profile = user_doc.to_dict()

        logged_in_user = {
            'id': user_record.uid,
            'email': user_record.email,
            'role': user_profile.get('role', 'user') # Default to 'user' if not set
        }
        return jsonify({'message': 'Login successful', 'user': logged_in_user}), 200
    except firebase_admin.auth.UserNotFoundError:
        return jsonify({'error': 'Invalid email or password.'}), 401
    except firebase_admin.auth.AuthError as e:
        print(f"Login AuthError: {e}")
        return jsonify({'error': f'Authentication error: {e}'}), 401
    except Exception as e:
        print(f"Unexpected login error: {e}")
        return jsonify({'error': f'An unexpected error occurred during login: {e}'}), 500


@app.route('/tickets/my', methods=['GET'])
def get_my_tickets():
    """
    API endpoint to get tickets created by a specific user.
    Requires 'userId' as a query parameter.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    try:
        # Query Firestore for tickets where 'creator_uid' matches the user_id
        tickets_stream = tickets_collection.where('creator_uid', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        tickets = [json_serializable_ticket(doc.id, doc.to_dict()) for doc in tickets_stream]
        return jsonify(tickets), 200
    except Exception as e:
        print(f"Error fetching my tickets: {e}")
        return jsonify({'error': f'Failed to fetch your tickets: {e}'}), 500

@app.route('/tickets/all', methods=['GET'])
def get_all_tickets():
    """
    API endpoint to get all tickets (typically for support roles).
    Filtering based on query parameters.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')
    # due_filter = request.args.get('due') # Not implementing due_date filter in Firestore Python for simplicity due to indexing complexity

    query = tickets_collection

    if status_filter:
        query = query.where('status', '==', status_filter)
    
    if assignment_filter:
        if assignment_filter == 'unassigned':
            query = query.where('assigned_to_email', '==', '') # Assuming empty string for unassigned
        # For 'assigned_to_me' or 'assigned_to_others', you would need to pass the support's email or a specific email to query
        # This API assumes simple 'unassigned' filter for now.

    try:
        tickets_stream = query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        tickets = [json_serializable_ticket(doc.id, doc.to_dict()) for doc in tickets_stream]
        return jsonify(tickets), 200
    except Exception as e:
        print(f"Error fetching all tickets: {e}")
        return jsonify({'error': f'Failed to fetch all tickets: {e}'}), 500

@app.route('/create', methods=['POST'])
def create_ticket():
    """
    API endpoint to create a new ticket in Firestore. Expects JSON input.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    reporter = data.get('reporter')
    status = data.get('status', 'Open')
    priority = data.get('priority', 'Low')
    creator_uid = data.get('creator_uid')
    creator_email = data.get('creator_email')

    if not all([title, description, reporter, creator_uid, creator_email]):
        return jsonify({'error': 'Title, Description, Reporter, Creator ID, and Creator Email are required!'}), 400

    try:
        new_ticket_data = {
            "title": title,
            "description": description,
            "status": status,
            "priority": priority,
            "reporter": reporter,
            "creator_uid": creator_uid,
            "creator_email": creator_email,
            "assigned_to_email": "", # Default empty
            "comments": [], # Comments will be an array of sub-documents
            "created_at": datetime.now(timezone.utc), # Store as UTC timezone-aware datetime
            "updated_at": datetime.now(timezone.utc)  # Store as UTC timezone-aware datetime
        }
        update_time, doc_ref = tickets_collection.add(new_ticket_data) # Add a new document
        return jsonify({'message': 'Ticket created successfully!', 'ticket_id': doc_ref.id}), 201
    except Exception as e:
        print(f"Error creating ticket: {e}")
        return jsonify({'error': f'Error creating ticket: {e}'}), 500

@app.route('/ticket/<ticket_id>', methods=['GET'])
def get_ticket_detail(ticket_id):
    """
    API endpoint to get details of a single ticket from Firestore.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    try:
        ticket_doc = tickets_collection.document(ticket_id).get()
        if not ticket_doc.exists:
            return jsonify({'error': 'Ticket not found'}), 404

        ticket_data = ticket_doc.to_dict()
        return jsonify(json_serializable_ticket(ticket_doc.id, ticket_data)), 200
    except Exception as e:
        print(f"Error retrieving ticket: {e}")
        return jsonify({'error': f'Error retrieving ticket: {e}'}), 500

@app.route('/ticket/<ticket_id>/update', methods=['POST'])
def update_ticket_api(ticket_id):
    """
    API endpoint to update ticket status and priority in Firestore. Expects JSON input.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    new_status = data.get('status')
    new_priority = data.get('priority')
    # assigned_to_email and due_date can be added here if needed, consistent with Flask's original update route

    update_fields = {
        "updated_at": datetime.now(timezone.utc) # Update timestamp with UTC timezone-aware datetime
    }
    if new_status:
        update_fields["status"] = new_status
    if new_priority:
        update_fields["priority"] = new_priority
    
    try:
        tickets_collection.document(ticket_id).update(update_fields)
        return jsonify({'message': 'Ticket updated successfully!'}), 200
    except Exception as e:
        print(f"Error updating ticket: {e}")
        return jsonify({'error': f'Error updating ticket: {e}'}), 500

@app.route('/ticket/<ticket_id>/add_comment', methods=['POST'])
def add_comment_api(ticket_id):
    """
    API endpoint to add a comment to a ticket in Firestore. Expects JSON input.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    comment_text = data.get('comment_text')
    commenter_name = data.get('commenter_name', 'Anonymous')

    if not comment_text:
        return jsonify({'error': 'Comment text cannot be empty!'}), 400

    new_comment = {
        'text': comment_text,
        'commenter': commenter_name,
        'timestamp': datetime.now(timezone.utc) # Store comment timestamp as UTC timezone-aware datetime
    }

    try:
        tickets_collection.document(ticket_id).update({
            "comments": firestore.ArrayUnion([new_comment]),
            "updated_at": datetime.now(timezone.utc) # Update ticket's updated_at when a comment is added
        })
        return jsonify({'message': 'Comment added successfully!'}), 200
    except Exception as e:
        print(f"Error adding comment: {e}")
        return jsonify({'error': f'Error adding comment: {e}'}), 500

# Entry point for running the Flask app
if __name__ == '__main__':
    # This will run the Flask development server
    app.run(debug=True)
