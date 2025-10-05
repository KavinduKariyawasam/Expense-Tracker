import logging
from typing import List

from auth import get_current_user
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from schemas import IncomeCreate, IncomeOut, IncomeUpdate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

income_route = APIRouter(prefix="/income", tags=["income"])


@income_route.post("/", response_model=IncomeOut)
def create_income(
    income: IncomeCreate, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Create a new income"""
    try:
        # Insert income
        db.execute(
            """
            INSERT INTO income (user_id, source, description, amount, category, income_date) 
            VALUES (%s, %s, %s, %s, %s, %s) 
            RETURNING id, user_id, source, description, amount, category, income_date, created_at, updated_at
        """,
            (
                current_user["id"],
                income.source,
                income.description,
                income.amount,
                income.category,
                income.income_date,
            ),
        )

        new_income = db.fetchone()
        income_id = new_income["id"]

        # Insert income items if provided
        items = []
        if income.items:
            for item in income.items:
                db.execute(
                    """
                    INSERT INTO income_items (income_id, description, quantity, unit_price, line_total) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING id, description, quantity, unit_price, line_total, created_at
                """,
                    (
                        income_id,
                        item.description,
                        item.quantity,
                        item.unit_price,
                        item.line_total,
                    ),
                )
                items.append(db.fetchone())

        # Return income with items
        return {**new_income, "items": items}

    except Exception as e:
        logger.error(f"Error creating income: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create income")


@income_route.get("/", response_model=List[IncomeOut])
def get_income(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """Get user's income"""
    try:
        # Get income
        db.execute(
            """
            SELECT id, user_id, source, description, amount, category, income_date, created_at, updated_at 
            FROM income 
            WHERE user_id = %s 
            ORDER BY income_date DESC, created_at DESC 
            LIMIT %s OFFSET %s
        """,
            (current_user["id"], limit, skip),
        )

        income_records = db.fetchall()

        # Get items for each income
        result = []
        for income_record in income_records:
            db.execute(
                """
                SELECT id, description, quantity, unit_price, line_total, created_at 
                FROM income_items 
                WHERE income_id = %s
            """,
                (income_record["id"],),
            )
            items = db.fetchall()
            result.append({**income_record, "items": items})

        return result

    except Exception as e:
        logger.error(f"Error getting income: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get income")


@income_route.get("/{income_id}", response_model=IncomeOut)
def get_income_by_id(
    income_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Get specific income"""
    try:
        # Get income
        db.execute(
            """
            SELECT id, user_id, source, description, amount, category, income_date, created_at, updated_at 
            FROM income 
            WHERE id = %s AND user_id = %s
        """,
            (income_id, current_user["id"]),
        )

        income_record = db.fetchone()
        if not income_record:
            raise HTTPException(status_code=404, detail="Income not found")

        # Get items
        db.execute(
            """
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM income_items 
            WHERE income_id = %s
        """,
            (income_id,),
        )
        items = db.fetchall()

        return {**income_record, "items": items}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting income: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get income")


@income_route.put("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: int,
    income: IncomeUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update income"""
    try:
        # Check if income exists and belongs to user
        db.execute(
            "SELECT id FROM income WHERE id = %s AND user_id = %s",
            (income_id, current_user["id"]),
        )
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Income not found")

        # Build update query dynamically
        updates = []
        values = []

        if income.source is not None:
            updates.append("source = %s")
            values.append(income.source)
        if income.description is not None:
            updates.append("description = %s")
            values.append(income.description)
        if income.amount is not None:
            updates.append("amount = %s")
            values.append(income.amount)
        if income.category is not None:
            updates.append("category = %s")
            values.append(income.category)
        if income.income_date is not None:
            updates.append("income_date = %s")
            values.append(income.income_date)

        if not updates:
            # If no updates, just return current income
            return get_income_by_id(income_id, db, current_user)

        values.append(income_id)
        values.append(current_user["id"])

        update_query = f"""
            UPDATE income 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s 
            RETURNING id, user_id, source, description, amount, category, income_date, created_at, updated_at
        """

        db.execute(update_query, values)
        updated_income = db.fetchone()

        # Get items
        db.execute(
            """
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM income_items 
            WHERE income_id = %s
        """,
            (income_id,),
        )
        items = db.fetchall()

        return {**updated_income, "items": items}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating income: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update income")


@income_route.delete("/{income_id}")
def delete_income(
    income_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Delete income"""
    try:
        # Check if income exists and belongs to user
        db.execute(
            "SELECT id FROM income WHERE id = %s AND user_id = %s",
            (income_id, current_user["id"]),
        )
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Income not found")

        # Delete income (items will be deleted by cascade)
        db.execute(
            "DELETE FROM income WHERE id = %s AND user_id = %s",
            (income_id, current_user["id"]),
        )

        return {"message": "Income deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting income: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete income")
