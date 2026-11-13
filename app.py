# brings in the modules this app needs
import os
import time

import psycopg
from flask import Flask, jsonify, redirect, render_template, request
from psycopg.rows import dict_row

from seed import seed_items

# creates the app and sets the shared values
app = Flask(__name__)

STATUSES = ["Stored", "Claimed", "Disposed"]
SETUP_LOCK_ID = 739201


# reads the database connection string from the environment
def get_database_url():
    url = os.environ.get("DATABASE_URL")
    if not url or not url.strip():
        raise RuntimeError(
            "DATABASE_URL is not set. Add the PostgreSQL connection string "
            "from Neon to the DATABASE_URL environment variable before starting Beacon."
        )
    return url.strip()


# opens a connection to the database and returns it
def get_connection():
    return psycopg.connect(
        get_database_url(), row_factory=dict_row, prepare_threshold=None
    )


# creates the items table inside the open transaction
def create_table(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            item_name TEXT NOT NULL,
            category TEXT NOT NULL,
            found_location TEXT NOT NULL,
            found_date TEXT NOT NULL,
            description TEXT,
            condition TEXT,
            is_fragile BOOLEAN DEFAULT FALSE,
            is_valuable BOOLEAN DEFAULT FALSE,
            is_sealed BOOLEAN DEFAULT FALSE,
            serial_number TEXT,
            shelf_code TEXT,
            status TEXT DEFAULT 'Stored',
            logged_by TEXT,
            created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
        )
        """
    )


# finds one item by its id and returns it as a dictionary
def find_item(connection, item_id):
    row = connection.execute("SELECT * FROM items WHERE id = %s", (item_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


# fills the table with sample items when it is empty
def seed_if_empty(connection):
    row = connection.execute("SELECT COUNT(*) AS total FROM items").fetchone()
    if row["total"] == 0:
        seed_items(connection)


# creates the table and seeds sample items under one lock
def prepare_database():
    connection = get_connection()
    try:
        with connection.transaction():
            connection.execute("SELECT pg_advisory_xact_lock(%s)", (SETUP_LOCK_ID,))
            create_table(connection)
            seed_if_empty(connection)
    finally:
        connection.close()


# page routes

# sends visitors from the root to the dashboard
@app.route("/")
def index():
    return redirect("/dashboard")


# shows the sign in page
@app.route("/login")
def login():
    return render_template("login.html")


# shows the dashboard page
@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


# shows the lost property records page
@app.route("/records")
def records():
    return render_template("records.html")


# shows the form for logging a new item
@app.route("/records/new")
def record_form():
    return render_template("record_form.html")


# api routes

# returns every item as json after a short wait
@app.route("/api/items")
def list_items():
    time.sleep(0.4)
    connection = get_connection()
    rows = connection.execute("SELECT * FROM items ORDER BY id").fetchall()
    connection.close()
    return jsonify([dict(row) for row in rows])


# returns how many items sit in each status
@app.route("/api/stats")
def get_stats():
    counts = {status: 0 for status in STATUSES}
    connection = get_connection()
    rows = connection.execute("SELECT status, COUNT(*) AS total FROM items GROUP BY status").fetchall()
    connection.close()
    for row in rows:
        counts[row["status"]] = row["total"]
    return jsonify(counts)


# adds a new item from the posted json data
@app.route("/api/items", methods=["POST"])
def create_item():
    data = request.get_json(silent=True) or {}
    required = ["item_name", "category", "found_location", "found_date"]
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({"error": "Missing required fields: " + ", ".join(missing)}), 400
    connection = get_connection()
    cursor = connection.execute(
        """
        INSERT INTO items (
            item_name, category, found_location, found_date, description,
            condition, is_fragile, is_valuable, is_sealed, serial_number,
            shelf_code, status, logged_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            data["item_name"].strip(),
            data["category"],
            data["found_location"],
            data["found_date"],
            data.get("description", ""),
            data.get("condition", "Good"),
            bool(data.get("is_fragile")),
            bool(data.get("is_valuable")),
            bool(data.get("is_sealed")),
            data.get("serial_number") or None,
            data.get("shelf_code") or None,
            data.get("status") or "Stored",
            data.get("logged_by") or "",
        ),
    )
    new_id = cursor.fetchone()["id"]
    connection.commit()
    item = find_item(connection, new_id)
    connection.close()
    return jsonify(item), 201


# changes the status of one item
@app.route("/api/items/<int:item_id>", methods=["PUT"])
def update_status(item_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in STATUSES:
        return jsonify({"error": "Status must be Stored, Claimed or Disposed"}), 400
    connection = get_connection()
    item = find_item(connection, item_id)
    if item is None:
        connection.close()
        return jsonify({"error": "Item not found"}), 404
    connection.execute("UPDATE items SET status = %s WHERE id = %s", (status, item_id))
    connection.commit()
    item = find_item(connection, item_id)
    connection.close()
    return jsonify(item)


# removes one item from the database
@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    connection = get_connection()
    item = find_item(connection, item_id)
    if item is None:
        connection.close()
        return jsonify({"error": "Item not found"}), 404
    connection.execute("DELETE FROM items WHERE id = %s", (item_id,))
    connection.commit()
    connection.close()
    return "", 204


# makes sure the table exists and has sample items before the server starts
prepare_database()

# starts the flask development server when run directly
if __name__ == "__main__":
    app.run(debug=True, port=5000)
