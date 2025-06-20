from flask import Flask, request, jsonify
from flask_cors import CORS # Import Flask-CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timezone # Import timezone for consistent datetimes
import traceback # Import traceback for detailed error logging

# Initialize the Flask application
app = Flask(__name__)
# Enable CORS for all routes, allowing requests from any origin (for development)
# In production, you would restrict this to your frontend's domain.
CORS(app)

# --- Firebase Firestore & Auth Configuration ---
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json' 

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
        user = auth.create_user(email=email, password=password)
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
    This endpoint now expects a Firebase ID Token in the Authorization header
    and verifies it to get the user's UID and retrieve their role from Firestore.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    # Get the ID token from the Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required with Bearer token!'}), 401
    
    id_token = auth_header.split('Bearer ')[1]

    try:
        # Verify the ID token. This will raise an error if the token is invalid or expired.
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']

        # Get user profile from Firestore using the UID
        user_doc = users_collection.document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found in database. Contact support.'}), 404
        
        user_profile = user_doc.to_dict()

        logged_in_user = {
            'id': uid,
            'email': user_profile.get('email', decoded_token.get('email')), # Prefer email from Firestore, fallback to token
            'role': user_profile.get('role', 'user') # Default to 'user' if role not set
        }
        return jsonify({'message': 'Login successful', 'user': logged_in_user}), 200
    except auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid or expired authentication token.'}), 401
    except Exception as e:
        print(f"Login error: {e}")
        print(traceback.format_exc()) # Print full traceback for debugging
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

    query = tickets_collection

    if status_filter:
        query = query.where('status', '==', status_filter)
    
    if assignment_filter:
        if assignment_filter == 'unassigned':
            query = query.where('assigned_to_email', '==', '') 

    try:
        tickets_stream = query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        tickets = [json_serializable_ticket(doc.id, doc.to_dict()) for doc in tickets_stream]
        return jsonify(tickets), 200
    except Exception as e:
        print(f"Error fetching all tickets: {e}")
        return jsonify({'error': f'Failed to fetch all tickets: {e}'}), 500

# Fixed get_next_ticket_number function with robust generator handling
def get_next_ticket_number(transaction):
    """
    Atomically increments a ticket number counter in Firestore and returns
    the next formatted 'ITXXXXXX' ID.
    This version explicitly handles the return type of transaction.get()
    to robustly deal with a possible unexpected generator.
    """
    counters_ref = db.collection('counters').document('ticket_id_counter')

    counter_doc_snapshot = None
    try:
        # transaction.get(DocumentReference) is expected to return a DocumentSnapshot.
        # However, if it returns an iterable/generator (which is non-standard but reported),
        # we'll attempt to extract the first item.
        result_from_get = transaction.get(counters_ref)
        
        # Check if the result is an iterable (like a generator)
        if hasattr(result_from_get, '__iter__'): 
            try:
                # Attempt to get the first (and only) item from the iterable
                counter_doc_snapshot = next(iter(result_from_get))
            except StopIteration:
                # If the iterable is empty, it means the document does not exist
                counter_doc_snapshot = None
        else:
            # If it's not an iterable, assume it's directly the DocumentSnapshot
            counter_doc_snapshot = result_from_get
    except Exception as e:
        print(f"Error retrieving counter document within transaction (unexpected behavior): {e}")
        traceback.print_exc()
        counter_doc_snapshot = None # Fallback if any error occurs during retrieval

    current_count = 0
    # Now, check if we successfully obtained a DocumentSnapshot and if it exists
    if counter_doc_snapshot and hasattr(counter_doc_snapshot, 'exists') and counter_doc_snapshot.exists: 
        current_count = counter_doc_snapshot.to_dict().get('count', 0)
        
    new_count = current_count + 1
    
    transaction.set(counters_ref, {'count': new_count})
    
    formatted_number = str(new_count).zfill(6)
    return f"IT{formatted_number}"


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
        # Use the @firestore.transactional decorator for atomic operations.
        # This decorator passes the transaction object to the decorated function.
        @firestore.transactional
        def create_ticket_transaction_callable(transaction_obj):
            # Call the get_next_ticket_number within this transactional context
            display_id = get_next_ticket_number(transaction_obj)

            new_ticket_data = {
                "title": title,
                "description": description,
                "status": status,
                "priority": priority,
                "reporter": reporter,
                "creator_uid": creator_uid,
                "creator_email": creator_email,
                "assigned_to_email": "",
                "comments": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "display_id": display_id
            }
            
            doc_ref = tickets_collection.document()
            transaction_obj.set(doc_ref, new_ticket_data)
            return doc_ref.id, display_id # Return the new doc ID and display_id

        # Execute the transactional function
        ticket_id, display_id = create_ticket_transaction_callable(db.transaction())

        return jsonify({
            'message': 'Ticket created successfully!',
            'ticket_id': ticket_id,
            'display_id': display_id
        }), 201
    except Exception as e:
        print(f"Error creating ticket: {e}")
        print(traceback.format_exc())
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
    assigned_to_email = data.get('assigned_to_email')

    update_fields = {
        "updated_at": datetime.now(timezone.utc)
    }
    if new_status:
        update_fields["status"] = new_status
    if new_priority:
        update_fields["priority"] = new_priority
    
    if assigned_to_email is not None: 
        update_fields["assigned_to_email"] = assigned_to_email

    try:
        tickets_collection.document(ticket_id).update(update_fields)
        return jsonify({'message': 'Ticket updated successfully!'}), 200
    except Exception as e:
        print(f"Error updating ticket: {e}")
        print(traceback.format_exc())
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
        'timestamp': datetime.now(timezone.utc)
    }

    try:
        tickets_collection.document(ticket_id).update({
            "comments": firestore.ArrayUnion([new_comment]),
            "updated_at": datetime.now(timezone.utc)
        })
        return jsonify({'message': 'Comment added successfully!'}), 200
    except Exception as e:
        print(f"Error adding comment: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error adding comment: {e}'}), 500

@app.route('/ticket/<ticket_id>/delete', methods=['DELETE'])
def delete_ticket(ticket_id):
    """
    API endpoint to delete a ticket from Firestore.
    Requires 'requester_uid' in the request body to verify user role.
    Only allows 'support' role users to delete tickets.
    """
    if not db_connected:
        return jsonify({'error': 'Database connection not established.'}), 500

    data = request.get_json()
    requester_uid = data.get('requester_uid')

    if not requester_uid:
        return jsonify({'error': 'Requester UID is required to verify permissions.'}), 400

    try:
        user_doc = users_collection.document(requester_uid).get()
        if not user_doc.exists:
            return jsonify({'error': 'Requester user profile not found.'}), 404
        
        user_role = user_doc.to_dict().get('role')
        if user_role != 'support':
            return jsonify({'error': 'Permission denied. Only support associates can delete tickets.'}), 403 # Forbidden

        tickets_collection.document(ticket_id).delete()
        
        return jsonify({'message': f'Ticket {ticket_id} deleted successfully!'}), 200

    except Exception as e:
        print(f"Error deleting ticket {ticket_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error deleting ticket: {e}'}), 500


# Entry point for running the Flask app
if __name__ == '__main__':
    app.run(debug=True)
