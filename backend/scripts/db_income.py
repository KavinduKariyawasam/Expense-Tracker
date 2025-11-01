import os

import psycopg2
from core import config

# SQL statements to create tables
CREATE_INCOME_TABLE = """
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(255),
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    income_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_INCOME_ITEMS_TABLE = """
CREATE TABLE IF NOT EXISTS income_items (
    id SERIAL PRIMARY KEY,
    income_id INTEGER REFERENCES income(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) DEFAULT 1.0,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def create_tables():
    try:
        # Connect to the PostgreSQL database
        connection = psycopg2.connect(
            host=config.db.HOST,
            port=config.db.PORT,
            database=config.db.NAME,
            user=config.db.USER,
            password=config.db.PASSWORD,
        )
        cursor = connection.cursor()

        # Execute SQL statements to create tables
        cursor.execute(CREATE_INCOME_TABLE)
        cursor.execute(CREATE_INCOME_ITEMS_TABLE)

        # Commit changes
        connection.commit()
        print("Tables created successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Close the database connection
        if connection:
            cursor.close()
            connection.close()


if __name__ == "__main__":
    create_tables()
