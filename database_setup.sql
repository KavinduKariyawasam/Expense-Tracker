-- Database setup for Expense Tracker with Income support
-- Run this script to set up the database tables

-- Users table (assuming this already exists)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table (assuming this already exists)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vendor VARCHAR(255),
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense items table (assuming this already exists)
CREATE TABLE IF NOT EXISTS expense_items (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) DEFAULT 1.0,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New Income table (similar structure to expenses)
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

-- New Income items table (similar structure to expense_items)
CREATE TABLE IF NOT EXISTS income_items (
    id SERIAL PRIMARY KEY,
    income_id INTEGER REFERENCES income(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) DEFAULT 1.0,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, income_date);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to expenses and income tables
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_updated_at ON income;
CREATE TRIGGER update_income_updated_at 
    BEFORE UPDATE ON income 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();