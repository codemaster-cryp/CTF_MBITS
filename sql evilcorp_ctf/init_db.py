import sqlite3

# Connect to database (creates file if it doesn't exist)
conn = sqlite3.connect("database.db")
c = conn.cursor()

# Delete table if already exists
c.execute("DROP TABLE IF EXISTS users")

# Create users table
c.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT
)
""")

# Insert normal users
c.execute("INSERT INTO users (username, password) VALUES ('elliot', 'fsociety')")
c.execute("INSERT INTO users (username, password) VALUES ('angela', 'trustno1')")

# Insert admin with FLAG as password
c.execute("INSERT INTO users (username, password) VALUES ('admin', 'mbits{evil_corp_is_e_corp}')")

conn.commit()
conn.close()

print("Database created successfully.")
