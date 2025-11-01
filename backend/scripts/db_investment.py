import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from core import config

# SQL statements to create tables
CREATE_INVESTMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    initial_amount DECIMAL(12, 2) NOT NULL,
    current_value DECIMAL(12, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    platform VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'LKR',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_INVESTMENT_TRANSACTIONS_TABLE = """
CREATE TABLE IF NOT EXISTS investment_transactions (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER REFERENCES investments(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    shares DECIMAL(10, 6),
    price_per_share DECIMAL(12, 6),
    transaction_date DATE NOT NULL,
    description TEXT,
    fees DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# Create indexes for better performance
CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment_id ON investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date);
"""


def create_tables():
    try:
        # Connect to the PostgreSQL database
        connection = psycopg2.connect(
            host=config.database.DB_HOST,
            port=config.database.DB_PORT,
            database=config.database.DB_NAME,
            user=config.database.DB_USER,
            password=config.database.DB_PASSWORD,
        )
        cursor = connection.cursor()

        # Execute SQL statements to create tables
        cursor.execute(CREATE_INVESTMENTS_TABLE)
        cursor.execute(CREATE_INVESTMENT_TRANSACTIONS_TABLE)
        cursor.execute(CREATE_INDEXES)

        # Commit changes
        connection.commit()
        print("Investment tables created successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Close the database connection
        if connection:
            cursor.close()
            connection.close()


if __name__ == "__main__":
    create_tables()