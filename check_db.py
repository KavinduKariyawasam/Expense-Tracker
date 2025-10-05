import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    cursor = conn.cursor()
    
    # Check if income table exists
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('income', 'expenses');
    """)
    
    tables = cursor.fetchall()
    print('Available tables:', tables)
    
    # Check if there's any income data
    cursor.execute('SELECT COUNT(*) FROM income;')
    income_count = cursor.fetchone()[0]
    print(f'Income records count: {income_count}')
    
    # Check if there's any expense data
    cursor.execute('SELECT COUNT(*) FROM expenses;')
    expense_count = cursor.fetchone()[0]
    print(f'Expense records count: {expense_count}')
    
    # Check sample expense data for current year
    cursor.execute("""
        SELECT EXTRACT(YEAR FROM expense_date) as year, COUNT(*) 
        FROM expenses 
        GROUP BY EXTRACT(YEAR FROM expense_date) 
        ORDER BY year DESC;
    """)
    expense_years = cursor.fetchall()
    print('Expense data by year:', expense_years)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f'Error: {e}')