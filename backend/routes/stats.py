import logging
from datetime import datetime, timedelta

from auth import get_current_user
from database import get_db
from fastapi import APIRouter, Depends, HTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

stats_route = APIRouter(tags=["stats"])


@stats_route.get("/me")
def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
    }


@stats_route.get("/dashboard-stats")
def get_dashboard_stats(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get dashboard statistics"""
    try:
        user_id = current_user["id"]

        # Total expenses
        db.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total_expenses,
                   COUNT(*) as total_expense_transactions
            FROM expenses 
            WHERE user_id = %s
        """,
            (user_id,),
        )
        expense_result = db.fetchone()

        # Total income
        db.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total_income,
                   COUNT(*) as total_income_transactions
            FROM income 
            WHERE user_id = %s
        """,
            (user_id,),
        )
        income_result = db.fetchone()

        # Monthly expenses (current month)
        current_month = datetime.now().replace(day=1)
        db.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as monthly_expenses,
                   COUNT(*) as monthly_expense_transactions
            FROM expenses 
            WHERE user_id = %s AND expense_date >= %s
        """,
            (user_id, current_month.date()),
        )
        monthly_expense_result = db.fetchone()

        # Monthly income (current month)
        db.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as monthly_income,
                   COUNT(*) as monthly_income_transactions
            FROM income 
            WHERE user_id = %s AND income_date >= %s
        """,
            (user_id, current_month.date()),
        )
        monthly_income_result = db.fetchone()

        # Categories count
        db.execute(
            """
            SELECT COUNT(DISTINCT category) as expense_categories_count
            FROM expenses 
            WHERE user_id = %s AND category IS NOT NULL
        """,
            (user_id,),
        )
        expense_categories_result = db.fetchone()

        db.execute(
            """
            SELECT COUNT(DISTINCT category) as income_categories_count
            FROM income 
            WHERE user_id = %s AND category IS NOT NULL
        """,
            (user_id,),
        )
        income_categories_result = db.fetchone()

        # Recent transactions count (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        db.execute(
            """
            SELECT COUNT(*) as recent_expense_transactions
            FROM expenses 
            WHERE user_id = %s AND created_at >= %s
        """,
            (user_id, week_ago),
        )
        recent_expense_result = db.fetchone()

        db.execute(
            """
            SELECT COUNT(*) as recent_income_transactions
            FROM income 
            WHERE user_id = %s AND created_at >= %s
        """,
            (user_id, week_ago),
        )
        recent_income_result = db.fetchone()

        total_expenses = float(expense_result["total_expenses"] or 0)
        total_income = float(income_result["total_income"] or 0)
        monthly_expenses = float(monthly_expense_result["monthly_expenses"] or 0)
        monthly_income = float(monthly_income_result["monthly_income"] or 0)

        return {
            "total_expenses": total_expenses,
            "total_income": total_income,
            "net_worth": total_income - total_expenses,
            "monthly_expenses": monthly_expenses,
            "monthly_income": monthly_income,
            "monthly_net": monthly_income - monthly_expenses,
            "total_expense_categories": int(
                expense_categories_result["expense_categories_count"] or 0
            ),
            "total_income_categories": int(
                income_categories_result["income_categories_count"] or 0
            ),
            "recent_expense_transactions": int(
                recent_expense_result["recent_expense_transactions"] or 0
            ),
            "recent_income_transactions": int(
                recent_income_result["recent_income_transactions"] or 0
            ),
            "total_expense_transactions": int(
                expense_result["total_expense_transactions"] or 0
            ),
            "total_income_transactions": int(
                income_result["total_income_transactions"] or 0
            ),
        }

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard stats")


@stats_route.get("/yearly-stats/{year}")
def get_yearly_stats(
    year: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Get yearly statistics with monthly breakdown for both expenses and income"""
    try:
        user_id = current_user["id"]

        # Get monthly expense breakdown for the year
        db.execute(
            """
            SELECT 
                EXTRACT(MONTH FROM expense_date) as month,
                COALESCE(SUM(amount), 0) as month_total,
                COUNT(*) as month_transactions
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
            GROUP BY EXTRACT(MONTH FROM expense_date)
            ORDER BY EXTRACT(MONTH FROM expense_date)
        """,
            (user_id, year),
        )
        monthly_expense_data = db.fetchall()

        # Get monthly income breakdown for the year
        db.execute(
            """
            SELECT 
                EXTRACT(MONTH FROM income_date) as month,
                COALESCE(SUM(amount), 0) as month_total,
                COUNT(*) as month_transactions
            FROM income 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM income_date) = %s
            GROUP BY EXTRACT(MONTH FROM income_date)
            ORDER BY EXTRACT(MONTH FROM income_date)
        """,
            (user_id, year),
        )
        monthly_income_data = db.fetchall()

        # Get total for the year
        db.execute(
            """
            SELECT 
                COALESCE(SUM(amount), 0) as year_total,
                COUNT(*) as year_transactions,
                COUNT(DISTINCT category) as year_categories
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
        """,
            (user_id, year),
        )
        year_expense_totals = db.fetchone()

        db.execute(
            """
            SELECT 
                COALESCE(SUM(amount), 0) as year_total,
                COUNT(*) as year_transactions,
                COUNT(DISTINCT category) as year_categories
            FROM income 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM income_date) = %s
        """,
            (user_id, year),
        )
        year_income_totals = db.fetchone()

        # Initialize all 12 months with zero values
        monthly_breakdown = []
        month_names = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]

        # Create dictionaries for easy lookup
        expense_monthly_dict = {int(row["month"]): row for row in monthly_expense_data}
        income_monthly_dict = {int(row["month"]): row for row in monthly_income_data}

        # Build complete monthly breakdown
        for month_num in range(1, 13):
            expense_data = expense_monthly_dict.get(
                month_num, {"month_total": 0, "month_transactions": 0}
            )
            income_data = income_monthly_dict.get(
                month_num, {"month_total": 0, "month_transactions": 0}
            )

            expense_total = float(expense_data["month_total"])
            income_total = float(income_data["month_total"])

            monthly_breakdown.append(
                {
                    "month": month_num,
                    "month_name": month_names[month_num - 1],
                    "expense_total": expense_total,
                    "income_total": income_total,
                    "net_total": income_total - expense_total,
                    "expense_transactions": int(expense_data["month_transactions"]),
                    "income_transactions": int(income_data["month_transactions"]),
                }
            )

        year_expense_total = float(year_expense_totals["year_total"] or 0)
        year_income_total = float(year_income_totals["year_total"] or 0)
        year_net_total = year_income_total - year_expense_total
        avg_monthly_expense = year_expense_total / 12 if year_expense_total > 0 else 0
        avg_monthly_income = year_income_total / 12 if year_income_total > 0 else 0

        return {
            "year": year,
            "monthly_breakdown": monthly_breakdown,
            "year_expense_total": year_expense_total,
            "year_income_total": year_income_total,
            "year_net_total": year_net_total,
            "year_expense_transactions": int(
                year_expense_totals["year_transactions"] or 0
            ),
            "year_income_transactions": int(
                year_income_totals["year_transactions"] or 0
            ),
            "year_expense_categories": int(year_expense_totals["year_categories"] or 0),
            "year_income_categories": int(year_income_totals["year_categories"] or 0),
            "avg_monthly_expense": round(avg_monthly_expense, 2),
            "avg_monthly_income": round(avg_monthly_income, 2),
        }

    except Exception as e:
        logger.error(f"Error getting yearly stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get yearly stats")


@stats_route.get("/available-years")
def get_available_years(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get years that have expense or income data"""
    try:
        user_id = current_user["id"]

        # Get years from both expenses and income
        db.execute(
            """
            SELECT DISTINCT year FROM (
                SELECT EXTRACT(YEAR FROM expense_date) as year FROM expenses WHERE user_id = %s
                UNION
                SELECT EXTRACT(YEAR FROM income_date) as year FROM income WHERE user_id = %s
            ) as all_years
            ORDER BY year DESC
        """,
            (user_id, user_id),
        )

        years = [int(row["year"]) for row in db.fetchall()]

        # If no data, include current year
        if not years:
            years = [datetime.now().year]

        return {"years": years}

    except Exception as e:
        logger.error(f"Error getting available years: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get available years")


@stats_route.get("/monthly-stats/{year}/{month}")
def get_monthly_stats(
    year: int, month: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Get detailed monthly statistics with daily breakdown, category analysis, and weekly summary"""
    try:
        user_id = current_user["id"]

        # Validate month
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400, detail="Month must be between 1 and 12"
            )

        # Get monthly totals
        db.execute(
            """
            SELECT 
                COALESCE(SUM(amount), 0) as total_expenses,
                COUNT(*) as expense_transactions
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
                AND EXTRACT(MONTH FROM expense_date) = %s
        """,
            (user_id, year, month),
        )
        expense_totals = db.fetchone()

        db.execute(
            """
            SELECT 
                COALESCE(SUM(amount), 0) as total_income,
                COUNT(*) as income_transactions
            FROM income 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM income_date) = %s
                AND EXTRACT(MONTH FROM income_date) = %s
        """,
            (user_id, year, month),
        )
        income_totals = db.fetchone()

        total_expenses = float(expense_totals["total_expenses"] or 0)
        total_income = float(income_totals["total_income"] or 0)
        net_amount = total_income - total_expenses
        expense_transactions = int(expense_totals["expense_transactions"] or 0)
        income_transactions = int(income_totals["income_transactions"] or 0)

        # Get daily breakdown
        db.execute(
            """
            WITH daily_expenses AS (
                SELECT 
                    EXTRACT(DAY FROM expense_date) as day,
                    COALESCE(SUM(amount), 0) as expenses
                FROM expenses 
                WHERE user_id = %s 
                    AND EXTRACT(YEAR FROM expense_date) = %s
                    AND EXTRACT(MONTH FROM expense_date) = %s
                GROUP BY EXTRACT(DAY FROM expense_date)
            ),
            daily_income AS (
                SELECT 
                    EXTRACT(DAY FROM income_date) as day,
                    COALESCE(SUM(amount), 0) as income
                FROM income 
                WHERE user_id = %s 
                    AND EXTRACT(YEAR FROM income_date) = %s
                    AND EXTRACT(MONTH FROM income_date) = %s
                GROUP BY EXTRACT(DAY FROM income_date)
            )
            SELECT 
                COALESCE(de.day, di.day) as day,
                COALESCE(de.expenses, 0) as expenses,
                COALESCE(di.income, 0) as income,
                COALESCE(di.income, 0) - COALESCE(de.expenses, 0) as net_amount
            FROM daily_expenses de
            FULL OUTER JOIN daily_income di ON de.day = di.day
            ORDER BY day
        """,
            (user_id, year, month, user_id, year, month),
        )
        daily_data = db.fetchall()

        daily_breakdown = []
        for row in daily_data:
            daily_breakdown.append(
                {
                    "day": int(row["day"]),
                    "expenses": float(row["expenses"]),
                    "income": float(row["income"]),
                    "net_amount": float(row["net_amount"]),
                }
            )

        # Get category breakdown for expenses
        db.execute(
            """
            SELECT 
                category,
                COALESCE(SUM(amount), 0) as amount,
                COUNT(*) as count
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
                AND EXTRACT(MONTH FROM expense_date) = %s
                AND category IS NOT NULL
            GROUP BY category
            ORDER BY amount DESC
        """,
            (user_id, year, month),
        )
        expense_categories = db.fetchall()

        # Get category breakdown for income
        db.execute(
            """
            SELECT 
                category,
                COALESCE(SUM(amount), 0) as amount,
                COUNT(*) as count
            FROM income 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM income_date) = %s
                AND EXTRACT(MONTH FROM income_date) = %s
                AND category IS NOT NULL
            GROUP BY category
            ORDER BY amount DESC
        """,
            (user_id, year, month),
        )
        income_categories = db.fetchall()

        category_breakdown = {
            "expenses": [
                {
                    "category": row["category"],
                    "amount": float(row["amount"]),
                    "count": int(row["count"]),
                }
                for row in expense_categories
            ],
            "income": [
                {
                    "category": row["category"],
                    "amount": float(row["amount"]),
                    "count": int(row["count"]),
                }
                for row in income_categories
            ],
        }

        # Get weekly summary
        db.execute(
            """
            WITH weekly_expenses AS (
                SELECT 
                    EXTRACT(WEEK FROM expense_date) as week_number,
                    COALESCE(SUM(amount), 0) as expenses,
                    MIN(expense_date) as start_date,
                    MAX(expense_date) as end_date
                FROM expenses 
                WHERE user_id = %s 
                    AND EXTRACT(YEAR FROM expense_date) = %s
                    AND EXTRACT(MONTH FROM expense_date) = %s
                GROUP BY EXTRACT(WEEK FROM expense_date)
            ),
            weekly_income AS (
                SELECT 
                    EXTRACT(WEEK FROM income_date) as week_number,
                    COALESCE(SUM(amount), 0) as income,
                    MIN(income_date) as start_date,
                    MAX(income_date) as end_date
                FROM income 
                WHERE user_id = %s 
                    AND EXTRACT(YEAR FROM income_date) = %s
                    AND EXTRACT(MONTH FROM income_date) = %s
                GROUP BY EXTRACT(WEEK FROM income_date)
            )
            SELECT 
                COALESCE(we.week_number, wi.week_number) as week_number,
                COALESCE(we.expenses, 0) as expenses,
                COALESCE(wi.income, 0) as income,
                COALESCE(wi.income, 0) - COALESCE(we.expenses, 0) as net,
                COALESCE(we.start_date, wi.start_date) as start_date,
                COALESCE(we.end_date, wi.end_date) as end_date
            FROM weekly_expenses we
            FULL OUTER JOIN weekly_income wi ON we.week_number = wi.week_number
            ORDER BY week_number
        """,
            (user_id, year, month, user_id, year, month),
        )
        weekly_data = db.fetchall()

        weekly_summary = []
        for row in weekly_data:
            start_date = (
                row["start_date"].strftime("%b %d") if row["start_date"] else ""
            )
            end_date = row["end_date"].strftime("%b %d") if row["end_date"] else ""
            date_range = f"{start_date} - {end_date}" if start_date and end_date else ""

            weekly_summary.append(
                {
                    "week_number": int(row["week_number"]),
                    "expenses": float(row["expenses"]),
                    "income": float(row["income"]),
                    "net": float(row["net"]),
                    "date_range": date_range,
                }
            )

        return {
            "year": year,
            "month": month,
            "total_expenses": total_expenses,
            "total_income": total_income,
            "net_amount": net_amount,
            "expense_transactions": expense_transactions,
            "income_transactions": income_transactions,
            "daily_breakdown": daily_breakdown,
            "category_breakdown": category_breakdown,
            "weekly_summary": weekly_summary,
        }

    except Exception as e:
        logger.error(f"Error getting monthly stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get monthly stats")
