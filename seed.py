# brings in the modules the seeding script needs
import random
from datetime import date, timedelta

# sample item names grouped by category
ITEM_NAMES = {
    "Electronics": [
        "Black iPhone 13",
        "White USB-C charger",
        "Silver laptop",
        "Wireless earbuds case",
        "Black power bank",
        "Smart watch",
        "Blue tablet",
        "Digital camera",
        "Noise-cancelling headphones",
        "Portable speaker",
    ],
    "Bags": [
        "Navy cabin suitcase",
        "Brown leather handbag",
        "Black backpack",
        "Green duffel bag",
        "Grey laptop bag",
        "Red rucksack",
        "Beige tote bag",
        "Blue holdall",
        "Small black clutch",
        "Orange wheeled suitcase",
    ],
    "Clothing": [
        "Denim jacket",
        "Grey hoodie",
        "Red scarf",
        "Black wool coat",
        "White trainers",
        "Baseball cap",
        "Leather gloves",
        "Blue jeans",
        "Rain jacket",
        "Striped jumper",
    ],
    "Documents": [
        "UK passport",
        "Boarding pass folder",
        "Driving licence",
        "Grey notebook",
        "Manila envelope",
        "Travel insurance papers",
        "Student ID card",
        "Bank card wallet",
        "Birth certificate copy",
        "Printed itinerary",
    ],
    "Keys": [
        "Car key with fob",
        "Bunch of house keys",
        "Hotel room key card",
        "Bicycle key",
        "Silver keyring",
        "Rental car key",
        "Locker key",
        "Van key",
        "Key with red tag",
        "Key safe fob",
    ],
    "Other": [
        "Children's teddy bear",
        "Reading glasses",
        "Umbrella",
        "Blue water bottle",
        "Duty-free bag",
        "Paperback novel",
        "Neck pillow",
        "Sunglasses case",
        "Foldable walking stick",
        "Medal in a case",
    ],
}

# the description used for each category
DESCRIPTIONS = {
    "Electronics": "Left on a seat near the departure board.",
    "Bags": "Handed in by a cleaner after the flight departed.",
    "Clothing": "Found folded over a chair at a cafe table.",
    "Documents": "Found at the check-in desk with papers inside.",
    "Keys": "Handed in by a passenger at the service desk.",
    "Other": "Found at the gate and brought to the desk.",
}

# the allowed locations staff names and item statuses
LOCATIONS = ["Terminal 1", "Terminal 2", "Security", "Gate area", "Taxi rank"]
STAFF = ["Maya Patel", "Tom Rees", "Aisha Khan", "Daniel Cole", "Sofia Rossi"]
STATUSES = ["Stored", "Claimed", "Disposed"]


# builds one full item row for a given name
def make_item(category, item_name, today):
    condition = random.choices(["Good", "Damaged"], weights=[8, 2])[0]
    is_valuable = category in ("Electronics", "Documents") or random.random() < 0.25
    is_fragile = random.random() < 0.2
    is_sealed = random.random() < 0.15
    serial_number = None
    if category == "Electronics":
        serial_number = "SN" + str(random.randint(100000, 999999))
    shelf_code = None
    if is_valuable:
        shelf_code = "S" + str(random.randint(1, 40)) + "-" + random.choice("ABCD")
    found_date = (today - timedelta(days=random.randint(0, 59))).isoformat()
    return (
        item_name,
        category,
        random.choice(LOCATIONS),
        found_date,
        DESCRIPTIONS[category],
        condition,
        is_fragile,
        is_valuable,
        is_sealed,
        serial_number,
        shelf_code,
        random.choices(STATUSES, weights=[6, 3, 1])[0],
        random.choice(STAFF),
    )


# inserts every sample item into the open transaction
def seed_items(connection):
    today = date.today()
    rows = []
    for category, names in ITEM_NAMES.items():
        for item_name in names:
            rows.append(make_item(category, item_name, today))
    with connection.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO items (
                item_name, category, found_location, found_date, description,
                condition, is_fragile, is_valuable, is_sealed, serial_number,
                shelf_code, status, logged_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    print("Inserted " + str(len(rows)) + " sample items")


# prepares the database and fills it when empty
if __name__ == "__main__":
    from app import prepare_database

    prepare_database()
    print("Database ready")
