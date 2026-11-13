# Beacon Lost Property Desk

Beacon is a web application for managing items handed in to an airport lost property desk. Staff can record found items, view existing records and update each item's status.

## Features

- Dashboard showing counts of stored, claimed and disposed items.
- Form for recording found items and their details.
- Search and filter records by category and status.
- Sort records and move between pages.
- Update item statuses and delete records.
- Keyboard-accessible navigation, form labels, status messages and error feedback.

## Built with

- Python and Flask
- PostgreSQL, hosted by Neon
- HTML, CSS and JavaScript

## Run locally

1. Make sure Python is installed.
2. Install the required packages:

   ```bash
   python -m pip install -r requirements.txt
   ```

3. Set `DATABASE_URL` to your Neon PostgreSQL connection string. In Windows PowerShell:

   ```powershell
   $env:DATABASE_URL = "your-neon-connection-string"
   ```

4. Start the application:

   ```bash
   python app.py
   ```

5. Open http://localhost:5000 in your browser.

Beacon uses the database specified by `DATABASE_URL`. It creates the items table if needed and adds sample records only when the table is empty. Keep the connection string private and do not commit it to GitHub.

## Live website

https://beacon-uni-project.vercel.app/

## Sign-in

Sign-in is simulated for this coursework project. Enter any non-empty username and password. Use the username `supervisor` to access the supervisor interface.
