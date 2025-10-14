-- Loan Management Tables for Expense Tracker

-- Main loans table to track loans given and received
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

-- Loan transactions table to track payments and interest
CREATE TABLE IF NOT EXISTS loan_transactions (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'interest', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_type ON loans(type);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_loan_id ON loan_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_date ON loan_transactions(transaction_date);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loans_updated_at();

-- Function to automatically update loan status based on balance and due date
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

CREATE TRIGGER trigger_update_loan_status
    BEFORE INSERT OR UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_status();

-- Function to update loan balance after transaction
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

CREATE TRIGGER trigger_update_loan_balance
    AFTER INSERT ON loan_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_balance_after_transaction();

-- Add some sample data for testing (optional - remove in production)
-- INSERT INTO loans (user_id, type, person_name, principal_amount, current_balance, loan_date, description)
-- VALUES 
-- (1, 'given', 'John Doe', 1000.00, 1000.00, '2024-01-15', 'Loan for business startup'),
-- (1, 'received', 'Jane Smith', 500.00, 300.00, '2024-02-01', 'Emergency loan for medical bills');