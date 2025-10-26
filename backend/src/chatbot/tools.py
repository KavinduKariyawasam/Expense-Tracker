"""
LangChain tools for the expense tracker chatbot
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from langchain.tools import tool

# Global variables to store database connection and user context
_db_connection = None
_current_user_id = None

logger = logging.getLogger(__name__)

def set_db_connection(db):
    """Set the database connection for tools to use"""
    global _db_connection
    _db_connection = db

def set_current_user(user_id: int):
    """Set the current user for tools to use"""
    global _current_user_id
    _current_user_id = user_id

@tool
def get_expense_summary(days: int) -> str:
    """
    Get a summary of expenses for the last X days.
    
    Returns:
        A string summary of expense data
    """
    try:
        if not _db_connection or not _current_user_id:
            return "Database connection or user not set"
        
        days = int(days)
        start_date = (datetime.now() - timedelta(days=days)).date()
        
        _db_connection.execute(
            """
            SELECT 
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount
            FROM expenses 
            WHERE user_id = %s AND expense_date >= %s
            """,
            (_current_user_id, start_date)
        )
        
        result = _db_connection.fetchone()
        
        if result['transaction_count'] == 0:
            return f"No expenses found in the last {days} days."
        
        return f"""Expense Summary (Last {days} days):
• Total Transactions: {result['transaction_count']}
• Total Amount: LKR {result['total_amount']:.2f}
• Average per Transaction: LKR {result['avg_amount']:.2f}
• Smallest Expense: LKR {result['min_amount']:.2f}
• Largest Expense: LKR {result['max_amount']:.2f}"""
        
    except Exception as e:
        logger.error(f"Error in get_expense_summary: {e}")
        return f"Error retrieving expense summary: {str(e)}"

@tool
def get_spending_by_category(days: int) -> str:
    """
    Get spending breakdown by category for the last X days.
    
    Returns:
        A string breakdown of spending by category
    """
    try:
        if not _db_connection or not _current_user_id:
            return "Database connection or user not set"
        
        days = int(days)
        start_date = (datetime.now() - timedelta(days=days)).date()
        
        _db_connection.execute(
            """
            SELECT 
                category,
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount
            FROM expenses 
            WHERE user_id = %s AND expense_date >= %s
            GROUP BY category
            ORDER BY total_amount DESC
            """,
            (_current_user_id, start_date)
        )
        
        results = _db_connection.fetchall()
        
        if not results:
            return f"No expenses found in the last {days} days."
        
        total_spending = sum(row['total_amount'] for row in results)
        
        breakdown = f"Spending by Category (Last {days} days):\n"
        breakdown += f"Total Spending: LKR {total_spending:.2f}\n\n"
        
        for row in results:
            percentage = (row['total_amount'] / total_spending) * 100 if total_spending > 0 else 0
            breakdown += f"• {row['category']}: LKR {row['total_amount']:.2f} ({percentage:.1f}%) - {row['transaction_count']} transactions\n"
        
        return breakdown
        
    except Exception as e:
        logger.error(f"Error in get_spending_by_category: {e}")
        return f"Error retrieving category breakdown: {str(e)}"

@tool
def get_income_vs_expenses(days: int) -> str:
    """
    Compare income vs expenses for the last X days.
    
    Returns:
        A string comparison of income vs expenses
    """
    try:
        if not _db_connection or not _current_user_id:
            return "Database connection or user not set"
        
        days = int(days)
        start_date = (datetime.now() - timedelta(days=days)).date()
        
        # Get expenses
        _db_connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses 
            WHERE user_id = %s AND expense_date >= %s
            """,
            (_current_user_id, start_date)
        )
        expenses_result = _db_connection.fetchone()
        total_expenses = expenses_result['total_expenses']
        
        # Get income
        _db_connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM income 
            WHERE user_id = %s AND income_date >= %s
            """,
            (_current_user_id, start_date)
        )
        income_result = _db_connection.fetchone()
        total_income = income_result['total_income']
        
        net_amount = total_income - total_expenses
        savings_rate = (net_amount / total_income * 100) if total_income > 0 else 0
        
        comparison = f"""Income vs Expenses (Last {days} days):
• Total Income: LKR {total_income:.2f}
• Total Expenses: LKR {total_expenses:.2f}
• Net Amount: LKR {net_amount:.2f}
• Savings Rate: {savings_rate:.1f}%

"""
        
        if net_amount > 0:
            comparison += "✅ You're saving money! Keep up the good work."
        elif net_amount == 0:
            comparison += "⚖️ You're breaking even."
        else:
            comparison += "⚠️ You're spending more than you earn. Consider reviewing your expenses."
        
        return comparison
        
    except Exception as e:
        logger.error(f"Error in get_income_vs_expenses: {e}")
        return f"Error retrieving income vs expenses comparison: {str(e)}"

@tool
def get_monthly_category_data() -> str:
    """
    Get detailed monthly category-wise spending data for the current month.
    
    Returns:
        A string with detailed monthly category analysis
    """
    try:
        if not _db_connection or not _current_user_id:
            return "Database connection or user not set"
        
        # Use current year/month
        now = datetime.now()
        target_year = now.year
        target_month = now.month
        
        # Get monthly category breakdown
        _db_connection.execute(
            """
            SELECT 
                category,
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
                AND EXTRACT(MONTH FROM expense_date) = %s
            GROUP BY category
            ORDER BY total_amount DESC
            """,
            (_current_user_id, target_year, target_month)
        )
        
        results = _db_connection.fetchall()
        
        if not results:
            month_name = datetime(target_year, target_month, 1).strftime("%B %Y")
            return f"No expenses found for {month_name}."
        
        # Calculate totals
        total_spending = sum(row['total_amount'] for row in results)
        total_transactions = sum(row['transaction_count'] for row in results)
        
        # Get daily spending for the month
        _db_connection.execute(
            """
            SELECT 
                EXTRACT(DAY FROM expense_date) as day,
                COALESCE(SUM(amount), 0) as daily_total
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
                AND EXTRACT(MONTH FROM expense_date) = %s
            GROUP BY EXTRACT(DAY FROM expense_date)
            ORDER BY daily_total DESC
            LIMIT 5
            """,
            (_current_user_id, target_year, target_month)
        )
        
        daily_results = _db_connection.fetchall()
        
        month_name = datetime(target_year, target_month, 1).strftime("%B %Y")
        
        analysis = f"""📊 Monthly Category Analysis - {month_name}

💰 SUMMARY:
• Total Spending: LKR {total_spending:.2f}
• Total Transactions: {total_transactions}
• Average per Transaction: LKR {total_spending/total_transactions:.2f}

📈 CATEGORY BREAKDOWN:
"""
        
        for i, row in enumerate(results, 1):
            percentage = (row['total_amount'] / total_spending) * 100 if total_spending > 0 else 0
            analysis += f"""
{i}. {row['category']}:
   • Amount: LKR {row['total_amount']:.2f} ({percentage:.1f}%)
   • Transactions: {row['transaction_count']}
   • Average: LKR {row['avg_amount']:.2f}
   • Range: LKR {row['min_amount']:.2f} - LKR {row['max_amount']:.2f}"""
        
        if daily_results:
            analysis += f"\n\n📅 TOP SPENDING DAYS:\n"
            for day_row in daily_results:
                analysis += f"• Day {int(day_row['day'])}: LKR {day_row['daily_total']:.2f}\n"
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error in get_monthly_category_data: {e}")
        return f"Error retrieving monthly category data: {str(e)}"


# List of all available tools
AVAILABLE_TOOLS = [
    get_expense_summary,
    get_spending_by_category,
    get_income_vs_expenses,
    get_monthly_category_data
]
