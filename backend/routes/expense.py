import logging
import os
import sys
from typing import List

from auth import get_current_user
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# expense router
expense_route = APIRouter(prefix="/expenses", tags=["expenses"])


# Expense endpoints
@expense_route.post("/", response_model=ExpenseOut)
def create_expense(
    expense: ExpenseCreate, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Create a new expense"""
    try:
        # Insert expense
        db.execute(
            """
            INSERT INTO expenses (user_id, vendor, description, amount, category, expense_date) 
            VALUES (%s, %s, %s, %s, %s, %s) 
            RETURNING id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at
        """,
            (
                current_user["id"],
                expense.vendor,
                expense.description,
                expense.amount,
                expense.category,
                expense.expense_date,
            ),
        )

        new_expense = db.fetchone()
        expense_id = new_expense["id"]

        # Insert expense items if provided
        items = []
        if expense.items:
            for item in expense.items:
                db.execute(
                    """
                    INSERT INTO expense_items (expense_id, description, quantity, unit_price, line_total) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING id, description, quantity, unit_price, line_total, created_at
                """,
                    (
                        expense_id,
                        item.description,
                        item.quantity,
                        item.unit_price,
                        item.line_total,
                    ),
                )
                items.append(db.fetchone())

        # Return expense with items
        return {**new_expense, "items": items}

    except Exception as e:
        logger.error(f"Error creating expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create expense")


@expense_route.get("/", response_model=List[ExpenseOut])
def get_expenses(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """Get user's expenses"""
    try:
        # Get expenses
        db.execute(
            """
            SELECT id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at 
            FROM expenses 
            WHERE user_id = %s 
            ORDER BY expense_date DESC, created_at DESC 
            LIMIT %s OFFSET %s
        """,
            (current_user["id"], limit, skip),
        )

        expenses = db.fetchall()

        # Get items for each expense
        result = []
        for expense in expenses:
            db.execute(
                """
                SELECT id, description, quantity, unit_price, line_total, created_at 
                FROM expense_items 
                WHERE expense_id = %s
            """,
                (expense["id"],),
            )
            items = db.fetchall()
            result.append({**expense, "items": items})

        return result

    except Exception as e:
        logger.error(f"Error getting expenses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get expenses")


@expense_route.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Get specific expense"""
    try:
        # Get expense
        db.execute(
            """
            SELECT id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at 
            FROM expenses 
            WHERE id = %s AND user_id = %s
        """,
            (expense_id, current_user["id"]),
        )

        expense = db.fetchone()
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Get items
        db.execute(
            """
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM expense_items 
            WHERE expense_id = %s
        """,
            (expense_id,),
        )
        items = db.fetchall()

        return {**expense, "items": items}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get expense")


@expense_route.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    expense: ExpenseUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update expense"""
    try:
        # Check if expense exists and belongs to user
        db.execute(
            "SELECT id FROM expenses WHERE id = %s AND user_id = %s",
            (expense_id, current_user["id"]),
        )
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Expense not found")

        # Build update query dynamically
        updates = []
        values = []

        if expense.vendor is not None:
            updates.append("vendor = %s")
            values.append(expense.vendor)
        if expense.description is not None:
            updates.append("description = %s")
            values.append(expense.description)
        if expense.amount is not None:
            updates.append("amount = %s")
            values.append(expense.amount)
        if expense.category is not None:
            updates.append("category = %s")
            values.append(expense.category)
        if expense.expense_date is not None:
            updates.append("expense_date = %s")
            values.append(expense.expense_date)

        if not updates:
            # If no updates, just return current expense
            return get_expense(expense_id, db, current_user)

        values.append(expense_id)
        values.append(current_user["id"])

        update_query = f"""
            UPDATE expenses 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s 
            RETURNING id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at
        """

        db.execute(update_query, values)
        updated_expense = db.fetchone()

        # Get items
        db.execute(
            """
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM expense_items 
            WHERE expense_id = %s
        """,
            (expense_id,),
        )
        items = db.fetchall()

        return {**updated_expense, "items": items}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update expense")


@expense_route.delete("/{expense_id}")
def delete_expense(
    expense_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Delete expense"""
    try:
        # Check if expense exists and belongs to user
        db.execute(
            "SELECT id FROM expenses WHERE id = %s AND user_id = %s",
            (expense_id, current_user["id"]),
        )
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Expense not found")

        # Delete expense (items will be deleted by cascade)
        db.execute(
            "DELETE FROM expenses WHERE id = %s AND user_id = %s",
            (expense_id, current_user["id"]),
        )

        return {"message": "Expense deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete expense")
