import psycopg2
from core import config
from logger import get_logger

logger = get_logger(__name__)

# SQL statements to create loan tables
CREATE_LOANS_TABLE = """
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('given', 'received')), -- 'given' = money you lent out, 'received' = money you borrowed
    person_name VARCHAR(255) NOT NULL, -- Name of the person involved
    person_contact VARCHAR(255), -- Phone/email contact (optional)
    principal_amount DECIMAL(10,2) NOT NULL CHECK (principal_amount > 0), -- Original loan amount
    current_balance DECIMAL(10,2) NOT NULL, -- Current outstanding balance
    interest_rate DECIMAL(5,2) DEFAULT 0.00, -- Interest rate (percentage)
    loan_date DATE NOT NULL, -- Date when loan was given/received
    due_date DATE, -- Expected return date (optional)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
    description TEXT, -- Additional notes about the loan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_LOAN_TRANSACTIONS_TABLE = """
CREATE TABLE IF NOT EXISTS loan_transactions (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'interest', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# Create indexes for better performance
CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_type ON loans(type);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_loan_id ON loan_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_date ON loan_transactions(transaction_date);
"""

# Create trigger function to update the updated_at timestamp
CREATE_UPDATE_TRIGGER_FUNCTION = """
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

# Create trigger to automatically update updated_at timestamp
CREATE_UPDATE_TRIGGER = """
DROP TRIGGER IF EXISTS trigger_update_loans_updated_at ON loans;
CREATE TRIGGER trigger_update_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loans_updated_at();
"""

# Create function to automatically update loan status based on balance and due date
CREATE_STATUS_UPDATE_FUNCTION = """
CREATE OR REPLACE FUNCTION update_loan_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as completed if balance is 0 or negative
    IF NEW.current_balance <= 0 THEN
        NEW.status = 'completed';
    -- Mark as overdue if past due date and still has balance
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.current_balance > 0 THEN
        NEW.status = 'overdue';
    -- Keep as active if balance exists and not overdue
    ELSIF NEW.current_balance > 0 THEN
        NEW.status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

# Create trigger to automatically update loan status
CREATE_STATUS_TRIGGER = """
DROP TRIGGER IF EXISTS trigger_update_loan_status ON loans;
CREATE TRIGGER trigger_update_loan_status
    BEFORE INSERT OR UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_status();
"""

# Create function to update loan balance after transaction
CREATE_BALANCE_UPDATE_FUNCTION = """
CREATE OR REPLACE FUNCTION update_loan_balance_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the loan balance based on transaction type
    IF NEW.transaction_type = 'payment' THEN
        UPDATE loans 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.loan_id;
    ELSIF NEW.transaction_type = 'interest' THEN
        UPDATE loans 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.loan_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE loans 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.loan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

# Create trigger to update loan balance after transactions
CREATE_BALANCE_TRIGGER = """
DROP TRIGGER IF EXISTS trigger_update_loan_balance ON loan_transactions;
CREATE TRIGGER trigger_update_loan_balance
    AFTER INSERT ON loan_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_balance_after_transaction();
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

        logger.info("Creating loan management tables...")

        # Execute SQL statements to create tables
        logger.info("Creating loans table...")
        cursor.execute(CREATE_LOANS_TABLE)

        logger.info("Creating loan_transactions table...")
        cursor.execute(CREATE_LOAN_TRANSACTIONS_TABLE)

        logger.info("Creating indexes...")
        cursor.execute(CREATE_INDEXES)

        logger.info("Creating trigger functions...")
        cursor.execute(CREATE_UPDATE_TRIGGER_FUNCTION)
        cursor.execute(CREATE_STATUS_UPDATE_FUNCTION)
        cursor.execute(CREATE_BALANCE_UPDATE_FUNCTION)

        logger.info("Creating triggers...")
        cursor.execute(CREATE_UPDATE_TRIGGER)
        cursor.execute(CREATE_STATUS_TRIGGER)
        cursor.execute(CREATE_BALANCE_TRIGGER)

        # Commit changes
        connection.commit()
        logger.info("Loan management tables created successfully!")
        logger.info("\nCreated tables:")
        logger.info("- loans (main loan tracking table)")
        logger.info("- loan_transactions (payment/interest tracking)")
        logger.info("\nCreated indexes for performance optimization")
        logger.info("Created automatic triggers for:")
        logger.info("- Updating timestamps")
        logger.info("- Managing loan status")
        logger.info("- Calculating loan balances")

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        if connection:
            connection.rollback()
    finally:
        # Close the database connection
        if connection:
            cursor.close()
            connection.close()
            logger.info("Database connection closed.")


def drop_tables():
    """Function to drop loan tables if needed for cleanup"""
    try:
        connection = psycopg2.connect(
            host=config.db.HOST,
            port=config.db.PORT,
            database=config.db.NAME,
            user=config.db.USER,
            password=config.db.PASSWORD,
        )
        cursor = connection.cursor()

        logger.info("Dropping loan management tables...")

        # Drop triggers first
        cursor.execute("DROP TRIGGER IF EXISTS trigger_update_loan_balance ON loan_transactions;")
        cursor.execute("DROP TRIGGER IF EXISTS trigger_update_loan_status ON loans;")
        cursor.execute("DROP TRIGGER IF EXISTS trigger_update_loans_updated_at ON loans;")

        # Drop tables (loan_transactions first due to foreign key)
        cursor.execute("DROP TABLE IF EXISTS loan_transactions CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS loans CASCADE;")

        # Drop functions
        cursor.execute("DROP FUNCTION IF EXISTS update_loan_balance_after_transaction();")
        cursor.execute("DROP FUNCTION IF EXISTS update_loan_status();")
        cursor.execute("DROP FUNCTION IF EXISTS update_loans_updated_at();")

        connection.commit()
        logger.info("Loan management tables dropped successfully!")

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            cursor.close()
            connection.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        drop_tables()
    else:
        create_tables()
        logger.info("\nTo drop these tables, run: python db_loan.py drop")
