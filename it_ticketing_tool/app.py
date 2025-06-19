from flask import Flask, render_template, request, redirect, url_for, flash, session
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timedelta, timezone # Import timezone
from functools import wraps # Used for the login_required decorator
# Removed: from google.cloud.firestore import Timestamp # This import is no longer needed or problematic

# Initialize the Flask application
app = Flask(__name__)
# Set a secret key for Flash messages (required for security)
# IMPORTANT: In a real app, use a strong, randomly generated environment variable!
app.secret_key = 'your_super_secret_key_for_sessions' # Make sure this is a strong, unique key

# --- Firebase Firestore & Auth Configuration ---
# IMPORTANT: Replace 'path/to/your/serviceAccountKey.json' with the actual path
# to the service account key file you downloaded from Firebase.
# This file must be in the same directory as app.py for this configuration.
# KEEP THIS FILE SECURE AND OUT OF VERSION CONTROL (e.g., .gitignore) IN PRODUCTION!
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'

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
    users_collection = db.collection('users') # New: Collection for user roles
    tickets_collection = db.collection('tickets') # Reference to your 'tickets' collection
    print("Connected to Firebase Firestore successfully!")
    db_connected = True
except Exception as e:
    print(f"Error connecting to Firebase Firestore: {e}")
    db_connected = False
    # In a production app, you'd want more robust error handling here.

# Decorator to ensure user is logged in
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Decorator to check for support associate role
def support_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_role' not in session or session['user_role'] != 'support':
            flash('Access denied. You must be a support associate.', 'error')
            return redirect(url_for('index')) # Redirect to index or a different access denied page
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_user_info():
    """
    Makes user_id, user_email, and user_role available in all templates.
    """
    return dict(
        user_id=session.get('user_id'),
        user_email=session.get('user_email'),
        user_role=session.get('user_role')
    )

# Jinja filter for datetime formatting
@app.template_filter('datetimeformat')
def datetimeformat_filter(value):
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d %H:%M:%S')
    return value

@app.before_request
def before_request_checks():
    """
    Checks database connection and clears session if DB is not connected.
    """
    global db_connected
    if not db_connected:
        session.clear() # Clear session if DB isn't connected to prevent auth issues
        flash("Database connection not established. Please check server logs and Firebase setup.", 'error')

def get_ticket_counts(user_id=None, user_role=None):
    """
    Calculates dynamic counts for filter categories.
    Adjusts based on user_id and user_role.
    """
    if not db_connected:
        return {
            'total_tickets': 0, 'open_tickets': 0, 'assigned_to_me': 0, 'assigned_to_others': 0,
            'unassigned': 0, 'overdue': 0, 'closed_tickets': 0, 'in_progress_tickets': 0
        }

    counts = {
        'total_tickets': 0, 'open_tickets': 0, 'assigned_to_me': 0, 'assigned_to_others': 0,
        'unassigned': 0, 'overdue': 0, 'closed_tickets': 0, 'in_progress_tickets': 0
    }

    try:
        # Determine the base query for counting: all tickets for support, or user's tickets otherwise
        if user_role == 'support':
            # For support, query all tickets
            all_tickets_stream = tickets_collection.stream()
            print("get_ticket_counts: Querying ALL tickets (Support view)")
        elif user_id:
            # For regular users, query only tickets they created
            all_tickets_stream = tickets_collection.where('creator_uid', '==', user_id).stream()
            print(f"get_ticket_counts: Querying tickets for user_id: {user_id} (My Tickets view)")
        else:
            print("get_ticket_counts: No user or role specified, returning zero counts.")
            return counts # No relevant user or role, return zero counts

        now = datetime.now(timezone.utc) # Make 'now' timezone-aware (UTC)

        for ticket_doc in all_tickets_stream:
            ticket = ticket_doc.to_dict()
            
            counts['total_tickets'] += 1 # Count all relevant tickets for the 'All Tickets' filter

            # Open Tickets (status is 'Open' only)
            if ticket.get('status') == 'Open':
                counts['open_tickets'] += 1
            
            # In Progress Tickets (new filter)
            if ticket.get('status') == 'In Progress':
                counts['in_progress_tickets'] += 1
            
            # Closed Tickets
            if ticket.get('status') == 'Closed':
                counts['closed_tickets'] += 1

            # Assigned to me (for the current session user)
            if ticket.get('assigned_to_email') == session.get('user_email'):
                counts['assigned_to_me'] += 1
            
            # Unassigned
            if not ticket.get('assigned_to_email'): # Checks for empty string or None
                counts['unassigned'] += 1
            
            # Assigned to others (has an assignee, but not the current user)
            if ticket.get('assigned_to_email') and ticket.get('assigned_to_email') != session.get('user_email'):
                counts['assigned_to_others'] += 1
            
            # Overdue (not closed/resolved AND due date has passed)
            due_date = ticket.get('due_date')
            converted_due_date = None

            if due_date: # Only process if due_date exists
                # Check if it's a Firestore Timestamp object (has .to_datetime() method)
                if hasattr(due_date, 'to_datetime'):
                    # Convert Firestore Timestamp to datetime object, which will be timezone-aware (UTC)
                    converted_due_date = due_date.to_datetime()
                elif isinstance(due_date, datetime):
                    # If it's already a datetime, ensure it's UTC-aware if naive
                    if due_date.tzinfo is None: # If naive, make it UTC-aware
                        converted_due_date = due_date.replace(tzinfo=timezone.utc)
                    else: # If already aware, use as is
                        converted_due_date = due_date
                else:
                    # Log a warning if due_date is an unexpected type
                    print(f"Warning: due_date for ticket {ticket_doc.id} is of unexpected type: {type(due_date)}. Cannot calculate overdue status.")
            
            # Now both 'converted_due_date' and 'now' should be timezone-aware for comparison
            if converted_due_date and ticket.get('status') not in ['Closed', 'Resolved'] and converted_due_date < now:
                counts['overdue'] += 1
        
        print(f"Calculated Counts: {counts}") # Print final calculated counts

    except Exception as e:
        print(f"Error calculating ticket counts: {e}")
        # Return default counts on error
    return counts

@app.route('/')
@login_required
def index():
    """
    Renders the homepage, displaying tickets created by the logged-in user.
    Supports filtering by status and assignment.
    """
    if not db_connected:
        return render_template('index.html', tickets=[], counts=get_ticket_counts())

    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    # Get filter parameters from query string
    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')
    due_filter = request.args.get('due')
    
    tickets_query = tickets_collection.where('creator_uid', '==', user_id)

    # Apply status filter if provided
    if status_filter:
        if status_filter == 'Open':
            tickets_query = tickets_query.where('status', '==', 'Open')
        elif status_filter == 'Closed':
            tickets_query = tickets_query.where('status', '==', 'Closed')
        elif status_filter == 'InProgress': # New filter option
            tickets_query = tickets_query.where('status', '==', 'In Progress')
        # Add more status conditions as needed
    
    # Apply assignment filter if provided
    if assignment_filter:
        if assignment_filter == 'assigned_to_me':
            tickets_query = tickets_query.where('assigned_to_email', '==', user_email)
        elif assignment_filter == 'unassigned':
            tickets_query = tickets_query.where('assigned_to_email', '==', '')
        elif assignment_filter == 'assigned_to_others':
            tickets_query = tickets_query.where('assigned_to_email', '!=', '')
            tickets_query = tickets_query.where('assigned_to_email', '!=', user_email)
    
    # Apply due filter (only for overdue now)
    if due_filter == 'overdue':
        tickets_query = tickets_query.where('due_date', '<', datetime.now(timezone.utc)) # Use timezone-aware datetime


    tickets = []
    try:
        tickets_stream = tickets_query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        for doc in tickets_stream:
            ticket_data = doc.to_dict()
            ticket_data['id'] = doc.id
            tickets.append(ticket_data)

        # Get counts for the filters applicable to the current view (My Tickets)
        counts = get_ticket_counts(user_id=user_id, user_role=session.get('user_role'))

        return render_template('index.html', tickets=tickets, counts=counts)
    except Exception as e:
        flash(f"Error fetching tickets: {e}", 'error')
        print(f"Error in index route: {e}")
        return render_template('index.html', tickets=[], counts=get_ticket_counts())

@app.route('/all_tickets')
@login_required
@support_required # Only support associates can access this route
def all_tickets():
    """
    Renders a page displaying all tickets, accessible only by support associates.
    Supports filtering by status and assignment.
    """
    if not db_connected:
        return render_template('index.html', tickets=[], page_title="All Tickets", counts=get_ticket_counts(user_role='support'))

    user_email = session.get('user_email')

    # Get filter parameters from query string
    status_filter = request.args.get('status')
    assignment_filter = request.args.get('assignment')
    due_filter = request.args.get('due')

    tickets_query = tickets_collection

    # Apply status filter if provided
    if status_filter:
        if status_filter == 'Open':
            tickets_query = tickets_query.where('status', '==', 'Open')
        elif status_filter == 'Closed':
            tickets_query = tickets_query.where('status', '==', 'Closed')
        elif status_filter == 'InProgress': # New filter option
            tickets_query = tickets_query.where('status', '==', 'In Progress')
        # Add more status conditions as needed
    
    # Apply assignment filter if provided
    if assignment_filter:
        if assignment_filter == 'assigned_to_me':
            tickets_query = tickets_query.where('assigned_to_email', '==', user_email)
        elif assignment_filter == 'unassigned':
            tickets_query = tickets_query.where('assigned_to_email', '==', '')
        elif assignment_filter == 'assigned_to_others':
            tickets_query = tickets_query.where('assigned_to_email', '!=', '')
            tickets_query = tickets_query.where('assigned_to_email', '!=', user_email)
    
    # Apply due filter (only for overdue now)
    if due_filter == 'overdue':
        tickets_query = tickets_query.where('due_date', '<', datetime.now(timezone.utc)) # Use timezone-aware datetime

    tickets = []
    try:
        tickets_stream = tickets_query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        for doc in tickets_stream:
            ticket_data = doc.to_dict()
            ticket_data['id'] = doc.id
            tickets.append(ticket_data)

        # Get counts for all tickets (as support associate)
        counts = get_ticket_counts(user_role='support') # Pass None for user_id to get all tickets' counts

        return render_template('index.html', tickets=tickets, page_title="All Tickets", counts=counts)
    except Exception as e:
        flash(f"Error fetching all tickets: {e}", 'error')
        print(f"Error in all_tickets route: {e}")
        return render_template('index.html', tickets=[], page_title="All Tickets", counts=get_ticket_counts(user_role='support'))


@app.route('/register', methods=('GET', 'POST'))
def register():
    """
    Handles user registration with Firebase Authentication.
    Assigns a 'user' role by default in Firestore's 'users' collection.
    """
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        # Default role for new registrations is 'user'
        role = request.form.get('role', 'user')

        if not email or not password:
            flash('Email and Password are required!', 'error')
            return render_template('register.html')

        if role not in ['user', 'support']:
            flash('Invalid role specified.', 'error')
            return render_template('register.html')

        try:
            # Create user in Firebase Authentication
            user = auth.create_user(email=email, password=password)

            # Store user role in Firestore 'users' collection
            users_collection.document(user.uid).set({'email': email, 'role': role})

            flash(f'User {email} registered successfully! You can now log in.', 'success')
            return redirect(url_for('login'))
        except auth.EmailAlreadyExistsError:
            flash('Email already registered. Please login or use a different email.', 'error')
        except Exception as e:
            flash(f'Error registering user: {e}', 'error')
            print(f"Registration error: {e}")

    return render_template('register.html')

@app.route('/login', methods=('GET', 'POST'))
def login():
    """
    Handles user login for demonstration purposes.
    NOTE: This is a SIMPLIFIED, INSECURE login for demonstration ONLY.
    Firebase Admin SDK does NOT directly verify passwords for client-side login requests.
    A production Flask app with Firebase Auth should:
    1. Use Firebase client-side SDK (e.g., JavaScript) to sign in the user.
    2. Get the user's ID token from the client.
    3. Send the ID token to the Flask backend.
    4. Verify the ID token on the Flask backend using `auth.verify_id_token(id_token)`.
    """
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password'] # Password is collected but not verified directly by Admin SDK here

        if not email or not password:
            flash('Email and Password are required!', 'error')
            return render_template('login.html')

        try:
            # Attempt to get user by email. This confirms existence but doesn't authenticate password.
            # In a real app, Firebase client-side SDK would handle password verification.
            user_record = auth.get_user_by_email(email)

            # Retrieve user role from Firestore based on the UID found
            user_doc = users_collection.document(user_record.uid).get()
            
            if not user_doc.exists:
                flash('User profile not found in database. Please contact support.', 'error')
                return render_template('login.html')
            
            user_profile = user_doc.to_dict()

            # Set session variables to "log in" the user
            session['user_id'] = user_record.uid
            session['user_email'] = user_record.email
            session['user_role'] = user_profile.get('role', 'user') # Default to 'user' if not set

            flash(f'Welcome, {session["user_email"]}! You are logged in as {session["user_role"]}.', 'success')
            return redirect(url_for('index'))
        except auth.UserNotFoundError:
            flash('Invalid email or password.', 'error') # This error implies email not found in Firebase Auth
        except auth.AuthError as e:
            flash(f'Authentication error: {e}', 'error')
            print(f"Login AuthError: {e}")
        except Exception as e:
            flash(f'An unexpected error occurred during login: {e}', 'error')
            print(f"Unexpected login error: {e}")

    return render_template('login.html')

@app.route('/logout')
def logout():
    """
    Logs out the user by clearing the session.
    """
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/create', methods=('GET', 'POST'))
@login_required # Only logged-in users can create tickets
def create():
    """
    Handles the creation of new tickets in Firestore.
    Associates the ticket with the logged-in user's ID.
    Automatically sets due_date to 10 days from creation.
    """
    if not db_connected:
        flash("Database is not connected. Cannot create ticket.", 'error')
        return redirect(url_for('index'))

    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        reporter = request.form['reporter'] # This will be the name entered by user
        status = request.form.get('status', 'Open')
        priority = request.form.get('priority', 'Low')
        assigned_to_email = request.form.get('assigned_to_email', '') # Optional assignment
        
        creator_uid = session.get('user_id') # Get ID of the logged-in user
        creator_email = session.get('user_email') # Get email of the logged-in user

        # Calculate due_date: 10 days from creation
        due_date_obj = datetime.now(timezone.utc) + timedelta(days=10) # Make creation datetime UTC-aware

        if not title or not description or not reporter:
            flash('Title, Description, and Reporter are required!', 'error')
        elif not creator_uid:
            flash('You must be logged in to create a ticket.', 'error')
            return redirect(url_for('login'))
        else:
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
                    "due_date": due_date_obj, # Set calculated due date
                    "comments": [],
                    "created_at": datetime.now(timezone.utc), # Make creation datetime UTC-aware
                    "updated_at": datetime.now(timezone.utc) # Make update datetime UTC-aware
                }
                tickets_collection.add(new_ticket_data)
                flash('Ticket created successfully!', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                flash(f"Error creating ticket: {e}", 'error')
                print(f"Error creating ticket: {e}")

    return render_template('create.html')


@app.route('/ticket/<ticket_id>')
@login_required # Only logged-in users can view ticket details
def ticket(ticket_id):
    """
    Displays the details of a single ticket from Firestore.
    Enforces role-based and ownership-based access.
    """
    if not db_connected:
        flash("Database is not connected. Cannot view ticket details.", 'error')
        return redirect(url_for('index'))

    user_id = session.get('user_id')
    user_role = session.get('user_role')

    try:
        ticket_doc = tickets_collection.document(ticket_id).get()
        if not ticket_doc.exists:
            flash('Ticket not found!', 'error')
            return redirect(url_for('index'))

        ticket_data = ticket_doc.to_dict()
        ticket_data['id'] = ticket_doc.id

        # Access Control: Check if user is support or the ticket creator
        if user_role != 'support' and user_id != ticket_data.get('creator_uid'):
            flash('Access denied. You can only view your own tickets.', 'error')
            return redirect(url_for('index'))

        # Datetime objects in comments are now handled by the 'datetimeformat' filter in templates
        comments = ticket_data.get('comments', [])

        return render_template('ticket.html', ticket=ticket_data, comments=comments)
    except Exception as e:
        flash(f"Error retrieving ticket: {e}", 'error')
        print(f"Error in ticket route: {e}")
        return redirect(url_for('index'))

@app.route('/ticket/<ticket_id>/update', methods=('POST',))
@login_required # Only logged-in users can update tickets
def update_ticket(ticket_id):
    """
    Handles updating the status and priority of an existing ticket in Firestore.
    Enforces role-based and ownership-based access.
    Also allows updating assigned_to_email and due_date.
    """
    if not db_connected:
        flash("Database is not connected. Cannot update ticket.", 'error')
        return redirect(url_for('ticket', ticket_id=ticket_id))

    user_id = session.get('user_id')
    user_role = session.get('user_role')

    try:
        # First, check if the user has permission to update this ticket
        ticket_doc = tickets_collection.document(ticket_id).get()
        if not ticket_doc.exists:
            flash('Ticket not found!', 'error')
            return redirect(url_for('index'))
        
        ticket_data = ticket_doc.to_dict()

        # Access Control: Check if user is support or the ticket creator
        if user_role != 'support' and user_id != ticket_data.get('creator_uid'):
            flash('Access denied. You can only update your own tickets.', 'error')
            return redirect(url_for('index')) # Redirect to index or ticket detail page

        new_status = request.form.get('status')
        new_priority = request.form.get('priority')
        new_assigned_to_email = request.form.get('assigned_to_email', '') # Get assigned email
        new_due_date_str = request.form.get('due_date') # Get due date string (can still be manually updated)

        update_fields = {
            "status": new_status,
            "priority": new_priority,
            "updated_at": datetime.now(timezone.utc) # Make update datetime UTC-aware
        }

        # Allow support to update assignment and due date
        # Also allow creator to change assigned_to and due_date if they have access
        if user_role == 'support' or user_id == ticket_data.get('creator_uid'):
            update_fields["assigned_to_email"] = new_assigned_to_email
            
            # Convert due_date string to datetime object
            new_due_date_obj = None
            if new_due_date_str:
                try:
                    new_due_date_obj = datetime.strptime(new_due_date_str, '%Y-%m-%d')
                    # If parsed from string, it's naive, so make it UTC-aware
                    new_due_date_obj = new_due_date_obj.replace(tzinfo=timezone.utc) 
                except ValueError:
                    flash('Invalid Due Date format. Please usełaszcza-MM-DD.', 'error')
                    return redirect(url_for('ticket', ticket_id=ticket_id))
            update_fields["due_date"] = new_due_date_obj
        
        tickets_collection.document(ticket_id).update(update_fields)
        flash('Ticket updated successfully!', 'success')
    except Exception as e:
        flash(f'Error updating ticket: {e}', 'error')
        print(f"Error updating ticket: {e}")

    return redirect(url_for('ticket', ticket_id=ticket_id))

@app.route('/ticket/<ticket_id>/add_comment', methods=('POST',))
@login_required # Only logged-in users can add comments
def add_comment(ticket_id):
    """
    Handles adding comments to an existing ticket in Firestore.
    Enforces role-based and ownership-based access.
    """
    if not db_connected:
        flash("Database is not connected. Cannot add comment.", 'error')
        return redirect(url_for('ticket', ticket_id=ticket_id))

    user_id = session.get('user_id')
    user_role = session.get('user_role')

    if request.method == 'POST':
        comment_text = request.form['comment_text']
        commenter_name = session.get('user_email', 'Anonymous') # Use logged-in user's email as commenter
        current_time = datetime.now(timezone.utc) # Make comment timestamp UTC-aware

        if not comment_text:
            flash('Comment cannot be empty!', 'error')
        else:
            try:
                # First, check if the user has permission to comment on this ticket
                ticket_doc = tickets_collection.document(ticket_id).get()
                if not ticket_doc.exists:
                    flash('Ticket not found!', 'error')
                    return redirect(url_for('index'))
                
                ticket_data = ticket_doc.to_dict()

                # Access Control: Check if user is support or the ticket creator
                if user_role != 'support' and user_id != ticket_data.get('creator_uid'):
                    flash('Access denied. You can only comment on your own tickets.', 'error')
                    return redirect(url_for('index'))

                new_comment = {
                    'text': comment_text,
                    'commenter': commenter_name,
                    'timestamp': current_time
                }
                # Use FieldValue.array_union to atomically add a new comment
                tickets_collection.document(ticket_id).update({
                    "comments": firestore.ArrayUnion([new_comment]),
                    "updated_at": datetime.now(timezone.utc) # Make update datetime UTC-aware
                })
                flash('Comment added successfully!', 'success')
            except Exception as e:
                flash(f'Error adding comment: {e}', 'error')
                print(f"Error adding comment: {e}")

    return redirect(url_for('ticket', ticket_id=ticket_id))

# Entry point for running the Flask app
if __name__ == '__main__':
    # This will run the Flask development server
    app.run(debug=True)
