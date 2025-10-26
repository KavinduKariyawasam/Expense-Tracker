-- Run this script to set up the loan management tables in your database
-- Execute this from your PostgreSQL command line or database management tool

-- Run the loan schema setup
\i loan_schema.sql

-- Verify tables were created
\dt

-- Sample queries to test the loan functionality:

-- 1. View all loans for user ID 1 (replace with actual user ID)
-- SELECT * FROM loans WHERE user_id = 1;

-- 2. View loan summary for user ID 1
-- SELECT 
--     SUM(CASE WHEN type = 'given' THEN principal_amount ELSE 0 END) as total_loans_given,
--     SUM(CASE WHEN type = 'received' THEN principal_amount ELSE 0 END) as total_loans_received,
--     SUM(CASE WHEN type = 'given' THEN current_balance ELSE 0 END) as total_outstanding_given,
--     SUM(CASE WHEN type = 'received' THEN current_balance ELSE 0 END) as total_outstanding_received
-- FROM loans 
-- WHERE user_id = 1;

-- 3. View all transactions for a specific loan
-- SELECT * FROM loan_transactions WHERE loan_id = 1 ORDER BY transaction_date DESC;

-- Quick test data (uncomment to add test loans - replace user_id with actual user ID)
-- INSERT INTO loans (user_id, type, person_name, principal_amount, current_balance, loan_date, description)
-- VALUES 
-- (1, 'given', 'John Doe', 1000.00, 1000.00, '2024-01-15', 'Loan for business startup'),
-- (1, 'received', 'Jane Smith', 500.00, 300.00, '2024-02-01', 'Emergency loan for medical bills');

-- Add a test payment (uncomment after creating loans above)
-- INSERT INTO loan_transactions (loan_id, transaction_type, amount, transaction_date, description)
-- VALUES (2, 'payment', 200.00, '2024-03-01', 'Partial payment towards loan');

COMMIT;