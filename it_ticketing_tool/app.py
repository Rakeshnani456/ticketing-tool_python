from flask import Flask, request, jsonify
from flask_cors import CORS # Import Flask-CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth, exceptions # Import exceptions for FirebaseError
from datetime import datetime, timezone # Import timezone for consistent datetimes

# Initialize the Flask application
app = Flask(__name__)
# Enable CORS for all routes, allowing requests from any origin (for development)
# In production, you would restrict this to your frontend's domain.
CORS(app)

# --- Firebase Firestore & Auth Configuration ---
# IMPORTANT: You MUST replace 'serviceAccountKey.json' with the actual path
# to the service account key file you downloaded from Firebase.
# This file must be in the same directory as app.py or an accessible path.
# KEEP THIS FILE SECURE AND OUT OF VERSION CONTROL (e.g., .gitignore) IN PRODUCTION!
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json' # Make sure this file is present

# Initialize Firebase Admin SDK globally
db = None
users_collection = None
tickets_collection = None
db_connected = False # Flag to track database connection status

try:
    # Initialize Firebase Admin SDK only once
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client() # Get a Firestore client
    users_collection = db.collection('users') # Collection for user roles
    tickets_collection = db.collection('tickets') # Reference to your 'tickets' collection
    print("Connected to Firebase Firestore successfully!")
    db_connected = True
except Exception as e:
    print(f"Error connecting to Firebase Firestore. Make sure 'serviceAccountKey.json' is correct and accessible: {e}")
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
        # Convert datetime objects to ISO 8601 strings for JSON serialization
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
    Creates user in Firebase Auth and stores user role in Firestore.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user') # Default role is 'user'

    if not email or not password:
        return jsonify({'error': 'Email and password are required!'}), 400

    if role not in ['user', 'support']:
        return jsonify({'error': 'Invalid role specified.'}), 400

    try:
        # Create user in Firebase Authentication
        user = auth.create_user(email=email, password=password)
        print(f"Firebase Auth user created: {user.uid}")

        # Store user role in Firestore 'users' collection using UID as document ID
        users_collection.document(user.uid).set({'email': email, 'role': role})
        print(f"Firestore user profile created for {user.uid} with role {role}")

        return jsonify({'message': f'User {email} registered successfully!', 'user_id': user.uid}), 201
    except firebase_admin.auth.EmailAlreadyExistsError:
        return jsonify({'error': 'Email already registered.'}), 409
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': f'Error registering user: {e}'}), 500

@app.route('/login', methods=['POST'])
def login():
    """
    API endpoint for user login verification.
    Expects a Firebase ID Token from the client-side in the Authorization header.
    Verifies the token and retrieves the user's role from Firestore.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    # 1. Get the ID token from the Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header with Bearer token is required!'}), 401

    id_token = auth_header.split(' ')[1] # Extract the token part

    try:
        # 2. Verify the ID token using Firebase Admin SDK
        # This securely checks if the token is valid, unexpired, and from your Firebase project.
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid'] # Get the user's UID from the verified token
        email_from_token = decoded_token.get('email', '') # Get the user's email from the verified token

        print(f"ID Token verified for UID: {uid}, Email: {email_from_token}")

        # 3. Retrieve user role from Firestore based on the verified UID
        user_doc = users_collection.document(uid).get()

        if not user_doc.exists:
            # This handles cases where a user exists in Firebase Auth but their profile
            # (including role) is missing in the Firestore 'users' collection.
            print(f"User profile for UID {uid} not found in Firestore.")
            return jsonify({'error': 'User profile not found in database. Please contact support.'}), 404

        user_profile = user_doc.to_dict()
        logged_in_user = {
            'id': uid,
            'email': email_from_token, # Use email from the decoded token (most reliable)
            'role': user_profile.get('role', 'user') # Get role from Firestore, default to 'user'
        }
        print(f"Login successful for user: {logged_in_user}")
        return jsonify({'message': 'Login successful', 'user': logged_in_user}), 200
    except firebase_admin.auth.InvalidIdTokenError as e:
        print(f"Invalid ID Token error: {e}")
        return jsonify({'error': 'Invalid or expired authentication token. Please log in again.'}), 401
    except firebase_admin.exceptions.FirebaseError as e:
        # Catch other Firebase Admin SDK errors during token verification or data fetch
        print(f"Firebase Admin SDK error during login: {e}")
        return jsonify({'error': f'Authentication error: {e.code}'}), 401
    except Exception as e:
        print(f"Unexpected login error: {e}")
        return jsonify({'error': f'An unexpected error occurred during login: {e}'}), 500


def get_next_ticket_number(transaction):
    """
    Atomically increments a ticket number counter in Firestore and returns
    the next formatted 'ITXXXXXX' ID.
    """
    counters_ref = db.collection('counters').document('ticket_id_counter')

    # The original issue: transaction.get(counters_ref) was reportedly
    # returning a generator object in some environments instead of a DocumentSnapshot.
    # This block now robustly handles that by checking if the returned object
    # is an iterable and extracting the snapshot if it is.
    retrieved_obj = transaction.get(counters_ref)
    
    # Check if the retrieved object is iterable but not a string/bytes (which are iterables)
    if hasattr(retrieved_obj, '__iter__') and not isinstance(retrieved_obj, (str, bytes)):
        try:
            # Attempt to get the next item from the generator
            counter_doc = next(retrieved_obj)
        except StopIteration:
            # If the generator is empty, the document effectively doesn't exist
            counter_doc = None
    else:
        # If it's not an iterable, it should already be the DocumentSnapshot
        counter_doc = retrieved_obj

    if counter_doc and counter_doc.exists: # Check if the document actually exists
        current_count = counter_doc.get('count')
    else:
        # Initialize if the counter doesn't exist.
        current_count = 0 

    new_count = current_count + 1
    
    # Update the counter in the transaction
    transaction.set(counters_ref, {'count': new_count})

    # Format the new count into a 6-digit string with leading zeros
    formatted_number = str(new_count).zfill(6)
    return f"IT{formatted_number}"


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
        # Order by creation date in descending order
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
    Supports filtering by status and assignment.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')

    query = tickets_collection

    if status_filter:
        query = query.where('status', '==', status_filter)

    if assignment_filter == 'unassigned':
        query = query.where('assigned_to_email', '==', '') # Assuming empty string for unassigned

    try:
        # Order by creation date in descending order
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
    Generates a sequential 'ITXXXXXX' display ID.
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
        # 1. Get a Transaction object from the client
        transaction_obj = db.transaction()

        # 2. Define the transactional logic in a nested function and decorate it
        # This function will receive the *active* transaction object when called.
        @firestore.transactional
        def create_ticket_transaction(transaction):
            """
            This function contains the logic to be executed within a Firestore transaction.
            It receives the active transaction object as an argument.
            """
            # Call the helper function within the transaction
            display_id = get_next_ticket_number(transaction)

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
                "updated_at": datetime.now(timezone.utc), # Store as UTC timezone-aware datetime
                "display_id": display_id # Store the new formatted ID here
            }
            
            # Add the ticket data within the same transaction
            doc_ref = tickets_collection.document() # Create a new document reference
            transaction.set(doc_ref, new_ticket_data) # Set the data using the transaction
            
            # Return values needed by the outer function
            return doc_ref.id, display_id

        # 3. Call the decorated transactional function, passing the transaction object.
        # The @firestore.transactional decorator handles the .run() and .commit() implicitly.
        ticket_id, display_id = create_ticket_transaction(transaction_obj)

        # Return the Firestore document ID and the new display_id
        return jsonify({
            'message': 'Ticket created successfully!',
            'ticket_id': ticket_id,
            'display_id': display_id
        }), 201
    except Exception as e:
        # It's good practice to log the full traceback for debugging
        import traceback
        print(f"Error creating ticket: {e}")
        print(traceback.format_exc()) # This will print the full stack trace
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
    assigned_to_email = data.get('assigned_to_email') # Added assigned_to_email

    update_fields = {
        "updated_at": datetime.now(timezone.utc) # Update timestamp with UTC timezone-aware datetime
    }
    if new_status:
        update_fields["status"] = new_status
    if new_priority:
        update_fields["priority"] = new_priority
    if assigned_to_email is not None: # Update only if provided (can be empty string)
        update_fields["assigned_to_email"] = assigned_to_email
    
    try:
        tickets_collection.document(ticket_id).update(update_fields)
        print(f"Ticket {ticket_id} updated with new status: {new_status}, priority: {new_priority}, assigned to: {assigned_to_email}")
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
        print(f"Comment added to ticket {ticket_id} by {commenter_name}")
        return jsonify({'message': 'Comment added successfully!'}), 200
    except Exception as e:
        print(f"Error adding comment: {e}")
        return jsonify({'error': f'Error adding comment: {e}'}), 500

# Entry point for running the Flask app
if __name__ == '__main__':
    # This will run the Flask development server
    app.run(debug=True)
