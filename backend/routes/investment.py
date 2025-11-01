from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_db
from logger import get_logger
from models.schemas import (
    InvestmentCreate,
    InvestmentOut,
    InvestmentSummary,
    InvestmentUpdate,
    InvestmentTransactionCreate,
    InvestmentTransactionOut,
)

logger = get_logger(__name__)

investment_route = APIRouter(prefix="/investments", tags=["investments"])


@investment_route.post("/", response_model=InvestmentOut)
def create_investment(investment: InvestmentCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new investment"""
    try:
        # Set current_value to initial_amount if not provided
        current_value = investment.current_value if investment.current_value is not None else investment.initial_amount
        
        # Insert investment
        logger.info(f"User {current_user['username']} is creating a new investment: {investment.name} - {investment.initial_amount}")
        db.execute(
            """
            INSERT INTO investments (user_id, name, type, description, initial_amount, current_value, 
                                   purchase_date, platform, currency, status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            RETURNING id, user_id, name, type, description, initial_amount, current_value, 
                     purchase_date, platform, currency, status, created_at, updated_at
        """,
            (
                current_user["id"],
                investment.name,
                investment.type,
                investment.description,
                investment.initial_amount,
                current_value,
                investment.purchase_date,
                investment.platform,
                investment.currency,
                investment.status,
            ),
        )

        new_investment = db.fetchone()
        investment_id = new_investment["id"]

        logger.info(f"Successfully created investment ID {investment_id}")

        # Return investment with empty transactions list
        return {**new_investment, "transactions": []}

    except Exception as e:
        logger.error(f"Error creating investment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create investment")


@investment_route.get("/", response_model=List[InvestmentOut])
def get_investments(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """Get user's investments"""
    try:
        # Get investments
        logger.info(f"Fetching investments for user {current_user['username']} with skip={skip} and limit={limit}")
        db.execute(
            """
            SELECT id, user_id, name, type, description, initial_amount, current_value, 
                   purchase_date, platform, currency, status, created_at, updated_at 
            FROM investments 
            WHERE user_id = %s 
            ORDER BY purchase_date DESC, created_at DESC 
            LIMIT %s OFFSET %s
        """,
            (current_user["id"], limit, skip),
        )

        investment_records = db.fetchall()

        # Get transactions for each investment
        result = []
        for investment_record in investment_records:
            logger.debug(f"Fetching transactions for investment ID: {investment_record['id']}")
            db.execute(
                """
                SELECT id, investment_id, transaction_type, amount, shares, price_per_share, 
                       transaction_date, description, fees, created_at 
                FROM investment_transactions 
                WHERE investment_id = %s
                ORDER BY transaction_date DESC, created_at DESC
            """,
                (investment_record["id"],),
            )
            transactions = db.fetchall()
            result.append({**investment_record, "transactions": transactions})

        logger.info(f"Successfully fetched {len(result)} investment records for user {current_user['username']}")

        return result

    except Exception as e:
        logger.error(f"Error getting investments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get investments")


@investment_route.get("/{investment_id}", response_model=InvestmentOut)
def get_investment_by_id(investment_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get specific investment"""
    try:
        # Get investment
        logger.info(f"Fetching investment ID {investment_id} for user {current_user['username']}")
        db.execute(
            """
            SELECT id, user_id, name, type, description, initial_amount, current_value, 
                   purchase_date, platform, currency, status, created_at, updated_at 
            FROM investments 
            WHERE id = %s AND user_id = %s
        """,
            (investment_id, current_user["id"]),
        )

        investment_record = db.fetchone()
        if not investment_record:
            logger.warning(f"Investment ID {investment_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Investment not found")

        # Get transactions
        db.execute(
            """
            SELECT id, investment_id, transaction_type, amount, shares, price_per_share, 
                   transaction_date, description, fees, created_at 
            FROM investment_transactions 
            WHERE investment_id = %s
            ORDER BY transaction_date DESC, created_at DESC
        """,
            (investment_id,),
        )
        transactions = db.fetchall()

        logger.info(f"Successfully fetched investment ID {investment_id} for user {current_user['username']}")

        return {**investment_record, "transactions": transactions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting investment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get investment")


@investment_route.put("/{investment_id}", response_model=InvestmentOut)
def update_investment(
    investment_id: int,
    investment: InvestmentUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update investment"""
    try:
        # Check if investment exists and belongs to user
        logger.info(f"Updating investment ID {investment_id} for user {current_user['username']}")
        db.execute(
            "SELECT id FROM investments WHERE id = %s AND user_id = %s",
            (investment_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Investment ID {investment_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Investment not found")

        # Build update query dynamically
        updates = []
        values = []

        if investment.name is not None:
            updates.append("name = %s")
            values.append(investment.name)
        if investment.type is not None:
            updates.append("type = %s")
            values.append(investment.type)
        if investment.description is not None:
            updates.append("description = %s")
            values.append(investment.description)
        if investment.current_value is not None:
            updates.append("current_value = %s")
            values.append(investment.current_value)
        if investment.platform is not None:
            updates.append("platform = %s")
            values.append(investment.platform)
        if investment.status is not None:
            updates.append("status = %s")
            values.append(investment.status)

        if not updates:
            # If no updates, just return current investment
            logger.info(f"No updates provided for investment ID {investment_id}, returning current record")
            return get_investment_by_id(investment_id, db, current_user)

        values.append(investment_id)
        values.append(current_user["id"])

        update_query = f"""
            UPDATE investments 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s 
            RETURNING id, user_id, name, type, description, initial_amount, current_value, 
                     purchase_date, platform, currency, status, created_at, updated_at
        """

        db.execute(update_query, values)
        updated_investment = db.fetchone()

        # Get transactions
        db.execute(
            """
            SELECT id, investment_id, transaction_type, amount, shares, price_per_share, 
                   transaction_date, description, fees, created_at 
            FROM investment_transactions 
            WHERE investment_id = %s
            ORDER BY transaction_date DESC, created_at DESC
        """,
            (investment_id,),
        )
        transactions = db.fetchall()

        logger.info(f"Successfully updated investment ID {investment_id} for user {current_user['username']}")

        return {**updated_investment, "transactions": transactions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating investment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update investment")


@investment_route.delete("/{investment_id}")
def delete_investment(investment_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Delete investment"""
    try:
        # Check if investment exists and belongs to user
        logger.info(f"Deleting investment ID {investment_id} for user {current_user['username']}")
        db.execute(
            "SELECT id FROM investments WHERE id = %s AND user_id = %s",
            (investment_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Investment ID {investment_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Investment not found")

        # Delete investment (transactions will be deleted by cascade)
        db.execute(
            "DELETE FROM investments WHERE id = %s AND user_id = %s",
            (investment_id, current_user["id"]),
        )

        logger.info(f"Successfully deleted investment ID {investment_id} for user {current_user['username']}")

        return {"message": "Investment deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting investment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete investment")


# Investment Transaction routes
@investment_route.post("/{investment_id}/transactions", response_model=InvestmentTransactionOut)
def create_investment_transaction(
    investment_id: int,
    transaction: InvestmentTransactionCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new investment transaction"""
    try:
        # Check if investment exists and belongs to user
        logger.info(f"Creating transaction for investment ID {investment_id}")
        db.execute(
            "SELECT id FROM investments WHERE id = %s AND user_id = %s",
            (investment_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Investment ID {investment_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Investment not found")

        # Insert transaction
        db.execute(
            """
            INSERT INTO investment_transactions (investment_id, transaction_type, amount, shares, 
                                               price_per_share, transaction_date, description, fees) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) 
            RETURNING id, investment_id, transaction_type, amount, shares, price_per_share, 
                     transaction_date, description, fees, created_at
        """,
            (
                investment_id,
                transaction.transaction_type,
                transaction.amount,
                transaction.shares,
                transaction.price_per_share,
                transaction.transaction_date,
                transaction.description,
                transaction.fees,
            ),
        )

        new_transaction = db.fetchone()

        logger.info(f"Successfully created transaction for investment ID {investment_id}")

        return new_transaction

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating investment transaction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create investment transaction")


@investment_route.get("/summary", response_model=InvestmentSummary)
def get_investment_summary(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get investment summary for the user"""
    try:
        logger.info(f"Fetching investment summary for user {current_user['username']}")
        
        # Get investment summary
        db.execute(
            """
            SELECT 
                COUNT(*) as total_investments,
                COALESCE(SUM(initial_amount), 0) as total_invested,
                COALESCE(SUM(current_value), 0) as current_total_value,
                type,
                status
            FROM investments 
            WHERE user_id = %s
            GROUP BY type, status
        """,
            (current_user["id"],),
        )
        
        summary_data = db.fetchall()
        
        # Calculate totals
        total_investments = 0
        total_invested = 0.0
        current_total_value = 0.0
        by_type = {}
        by_status = {}
        
        for row in summary_data:
            total_investments += row["total_investments"]
            total_invested += row["total_invested"]
            current_total_value += row["current_total_value"]
            
            # Group by type
            if row["type"] not in by_type:
                by_type[row["type"]] = {"count": 0, "invested": 0.0, "current_value": 0.0}
            by_type[row["type"]]["count"] += row["total_investments"]
            by_type[row["type"]]["invested"] += row["total_invested"]
            by_type[row["type"]]["current_value"] += row["current_total_value"]
            
            # Group by status
            if row["status"] not in by_status:
                by_status[row["status"]] = {"count": 0, "invested": 0.0, "current_value": 0.0}
            by_status[row["status"]]["count"] += row["total_investments"]
            by_status[row["status"]]["invested"] += row["total_invested"]
            by_status[row["status"]]["current_value"] += row["current_total_value"]
        
        # Calculate gain/loss
        total_gain_loss = current_total_value - total_invested
        total_gain_loss_percentage = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0.0

        logger.info(f"Successfully fetched investment summary for user {current_user['username']}")

        return {
            "total_investments": total_investments,
            "total_invested": total_invested,
            "current_total_value": current_total_value,
            "total_gain_loss": total_gain_loss,
            "total_gain_loss_percentage": total_gain_loss_percentage,
            "by_type": by_type,
            "by_status": by_status,
        }

    except Exception as e:
        logger.error(f"Error getting investment summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get investment summary")