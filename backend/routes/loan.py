from datetime import date
from typing import List

from auth import get_current_user
from logger import get_logger
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import (
    LoanCreate,
    LoanOut,
    LoanSummary,
    LoanTransactionCreate,
    LoanTransactionOut,
    LoanUpdate,
)

logger = get_logger(__name__)

loan_route = APIRouter(prefix="/loans", tags=["loans"])


@loan_route.post("/", response_model=LoanOut)
def create_loan(
    loan: LoanCreate, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Create a new loan"""
    try:
        # Insert loan
        logger.info(f"User {current_user['username']} is creating a new loan")
        db.execute(
            """
            INSERT INTO loans (user_id, type, person_name, person_contact, principal_amount, 
                             current_balance, interest_rate, loan_date, due_date, description) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            RETURNING id, user_id, type, person_name, person_contact, principal_amount, 
                     current_balance, interest_rate, loan_date, due_date, status, 
                     description, created_at, updated_at
        """,
            (
                current_user["id"],
                loan.type,
                loan.person_name,
                loan.person_contact,
                loan.principal_amount,
                loan.principal_amount,  # current_balance starts as principal_amount
                loan.interest_rate,
                loan.loan_date,
                loan.due_date,
                loan.description,
            ),
        )

        new_loan = db.fetchone()
        logger.info(f"Loan created with ID: {new_loan['id']}")
        return {**new_loan, "transactions": []}

    except Exception as e:
        logger.error(f"Error creating loan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create loan")


@loan_route.get("/", response_model=List[LoanOut])
def get_loans(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    loan_type: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
):
    """Get user's loans with optional filtering"""
    try:
        # Build query with optional filters
        logger.info(f"User {current_user['username']} is retrieving loans")
        where_conditions = ["user_id = %s"]
        params = [current_user["id"]]

        if loan_type and loan_type in ["given", "received"]:
            logger.info(f"Filtering loans by type: {loan_type}")
            where_conditions.append("type = %s")
            params.append(loan_type)

        if status and status in ["active", "completed", "overdue", "cancelled"]:
            logger.info(f"Filtering loans by status: {status}")
            where_conditions.append("status = %s")
            params.append(status)

        params.extend([limit, skip])

        # Get loans
        db.execute(
            f"""
            SELECT id, user_id, type, person_name, person_contact, principal_amount, 
                   current_balance, interest_rate, loan_date, due_date, status, 
                   description, created_at, updated_at 
            FROM loans 
            WHERE {' AND '.join(where_conditions)}
            ORDER BY created_at DESC 
            LIMIT %s OFFSET %s
        """,
            params,
        )

        loans = db.fetchall()
        
        logger.info(f"Retrieved {len(loans)} loans for user {current_user['username']}")

        # Get transactions for each loan
        result = []
        for loan in loans:
            logger.debug(f"Retrieving transactions for loan ID: {loan['id']}")
            db.execute(
                """
                SELECT id, loan_id, transaction_type, amount, transaction_date, 
                       description, created_at 
                FROM loan_transactions 
                WHERE loan_id = %s
                ORDER BY transaction_date DESC, created_at DESC
            """,
                (loan["id"],),
            )
            transactions = db.fetchall()
            result.append({**loan, "transactions": transactions})

        logger.info(f"Successfully retrieved loans and their transactions")
        
        return result

    except Exception as e:
        logger.error(f"Error getting loans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get loans")


@loan_route.get("/summary", response_model=LoanSummary)
def get_loan_summary(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get loan summary statistics"""
    try:
        # Get summary statistics
        logger.info(f"User {current_user['username']} is retrieving loan summary")
        db.execute(
            """
            SELECT 
                SUM(CASE WHEN type = 'given' THEN principal_amount ELSE 0 END) as total_loans_given,
                SUM(CASE WHEN type = 'received' THEN principal_amount ELSE 0 END) as total_loans_received,
                SUM(CASE WHEN type = 'given' THEN current_balance ELSE 0 END) as total_outstanding_given,
                SUM(CASE WHEN type = 'received' THEN current_balance ELSE 0 END) as total_outstanding_received,
                COUNT(CASE WHEN type = 'given' AND status = 'active' THEN 1 END) as active_loans_given,
                COUNT(CASE WHEN type = 'received' AND status = 'active' THEN 1 END) as active_loans_received,
                COUNT(CASE WHEN type = 'given' AND status = 'overdue' THEN 1 END) as overdue_loans_given,
                COUNT(CASE WHEN type = 'received' AND status = 'overdue' THEN 1 END) as overdue_loans_received
            FROM loans 
            WHERE user_id = %s
        """,
            (current_user["id"],),
        )

        summary = db.fetchone()
        logger.info(f"Successfully retrieved loan summary for user {current_user['username']}")
        return {
            "total_loans_given": float(summary["total_loans_given"] or 0),
            "total_loans_received": float(summary["total_loans_received"] or 0),
            "total_outstanding_given": float(summary["total_outstanding_given"] or 0),
            "total_outstanding_received": float(
                summary["total_outstanding_received"] or 0
            ),
            "active_loans_given": int(summary["active_loans_given"] or 0),
            "active_loans_received": int(summary["active_loans_received"] or 0),
            "overdue_loans_given": int(summary["overdue_loans_given"] or 0),
            "overdue_loans_received": int(summary["overdue_loans_received"] or 0),
        }

    except Exception as e:
        logger.error(f"Error getting loan summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get loan summary")


@loan_route.get("/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get specific loan"""
    try:
        # Get loan
        logger.info(f"User {current_user['username']} is retrieving loan ID: {loan_id}")
        db.execute(
            """
            SELECT id, user_id, type, person_name, person_contact, principal_amount, 
                   current_balance, interest_rate, loan_date, due_date, status, 
                   description, created_at, updated_at 
            FROM loans 
            WHERE id = %s AND user_id = %s
        """,
            (loan_id, current_user["id"]),
        )

        loan = db.fetchone()
        if not loan:
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Get transactions
        db.execute(
            """
            SELECT id, loan_id, transaction_type, amount, transaction_date, 
                   description, created_at 
            FROM loan_transactions 
            WHERE loan_id = %s
            ORDER BY transaction_date DESC, created_at DESC
        """,
            (loan_id,),
        )
        transactions = db.fetchall()
        
        logger.info(f"Successfully retrieved loan ID: {loan_id} and its transactions")

        return {**loan, "transactions": transactions}

    except HTTPException:
        logger.warning(f"HTTPException raised while retrieving loan ID: {loan_id}")
        raise
    except Exception as e:
        logger.error(f"Error getting loan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get loan")


@loan_route.put("/{loan_id}", response_model=LoanOut)
def update_loan(
    loan_id: int,
    loan: LoanUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update loan"""
    try:
        # Check if loan exists and belongs to user
        logger.info(f"User {current_user['username']} is updating loan ID: {loan_id}")
        db.execute(
            "SELECT id FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Build update query dynamically
        updates = []
        values = []

        if loan.person_name is not None:
            updates.append("person_name = %s")
            values.append(loan.person_name)
        if loan.person_contact is not None:
            updates.append("person_contact = %s")
            values.append(loan.person_contact)
        if loan.interest_rate is not None:
            updates.append("interest_rate = %s")
            values.append(loan.interest_rate)
        if loan.due_date is not None:
            updates.append("due_date = %s")
            values.append(loan.due_date)
        if loan.description is not None:
            updates.append("description = %s")
            values.append(loan.description)
        if loan.status is not None:
            updates.append("status = %s")
            values.append(loan.status)

        if not updates:
            logger.info(f"No updates provided for loan ID: {loan_id}")
            # If no updates, just return current loan
            return get_loan(loan_id, db, current_user)

        values.extend([loan_id, current_user["id"]])

        update_query = f"""
            UPDATE loans 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s 
            RETURNING id, user_id, type, person_name, person_contact, principal_amount, 
                     current_balance, interest_rate, loan_date, due_date, status, 
                     description, created_at, updated_at
        """

        db.execute(update_query, values)
        updated_loan = db.fetchone()
        
        logger.info(f"Successfully updated loan ID: {loan_id}")

        # Get transactions
        db.execute(
            """
            SELECT id, loan_id, transaction_type, amount, transaction_date, 
                   description, created_at 
            FROM loan_transactions 
            WHERE loan_id = %s
            ORDER BY transaction_date DESC, created_at DESC
        """,
            (loan_id,),
        )
        transactions = db.fetchall()
        
        logger.info(f"Retrieved transactions for updated loan ID: {loan_id}")

        return {**updated_loan, "transactions": transactions}

    except HTTPException:
        logger.error(f"HTTPException raised while updating loan ID: {loan_id}")
        raise
    except Exception as e:
        logger.error(f"Error updating loan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update loan")


@loan_route.delete("/{loan_id}")
def delete_loan(
    loan_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Delete loan"""
    try:
        # Check if loan exists and belongs to user
        logger.info(f"User {current_user['username']} is deleting loan ID: {loan_id}")
        db.execute(
            "SELECT id FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Delete loan (transactions will be deleted by cascade)
        db.execute(
            "DELETE FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        logger.info(f"Successfully deleted loan ID: {loan_id}")
        
        return {"message": "Loan deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting loan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete loan")


@loan_route.post("/{loan_id}/transactions", response_model=LoanTransactionOut)
def add_loan_transaction(
    loan_id: int,
    transaction: LoanTransactionCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Add a transaction to a loan (payment, interest, or adjustment)"""
    try:
        # Check if loan exists and belongs to user
        logger.info(f"User {current_user['username']} is adding transaction to loan ID: {loan_id}")
        db.execute(
            "SELECT id, current_balance FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        loan_data = db.fetchone()
        if not loan_data:
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Insert transaction
        db.execute(
            """
            INSERT INTO loan_transactions (loan_id, transaction_type, amount, transaction_date, description) 
            VALUES (%s, %s, %s, %s, %s) 
            RETURNING id, loan_id, transaction_type, amount, transaction_date, description, created_at
        """,
            (
                loan_id,
                transaction.transaction_type,
                transaction.amount,
                transaction.transaction_date,
                transaction.description,
            ),
        )

        new_transaction = db.fetchone()
        
        logger.info(f"Transaction added with ID: {new_transaction['id']} to loan ID: {loan_id}")
        
        return new_transaction

    except HTTPException:
        logger.error(f"HTTPException raised while adding transaction to loan ID: {loan_id}")
        raise
    except Exception as e:
        logger.error(f"Error adding loan transaction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add loan transaction")


@loan_route.get("/{loan_id}/transactions", response_model=List[LoanTransactionOut])
def get_loan_transactions(
    loan_id: int, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Get all transactions for a specific loan"""
    try:
        # Check if loan exists and belongs to user
        logger.info(f"User {current_user['username']} is retrieving transactions for loan ID: {loan_id}")
        db.execute(
            "SELECT id FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Get transactions
        db.execute(
            """
            SELECT id, loan_id, transaction_type, amount, transaction_date, 
                   description, created_at 
            FROM loan_transactions 
            WHERE loan_id = %s
            ORDER BY transaction_date DESC, created_at DESC
        """,
            (loan_id,),
        )
        
        logger.info(f"Successfully retrieved transactions for loan ID: {loan_id}")

        return db.fetchall()

    except HTTPException:
        logger.error(f"HTTPException raised while retrieving transactions for loan ID: {loan_id}")
        raise
    except Exception as e:
        logger.error(f"Error getting loan transactions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get loan transactions")


@loan_route.delete("/{loan_id}/transactions/{transaction_id}")
def delete_loan_transaction(
    loan_id: int,
    transaction_id: int,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a loan transaction and recalculate loan balance"""
    try:
        # Check if loan exists and belongs to user
        logger.info(f"User {current_user['username']} is deleting transaction ID: {transaction_id} from loan ID: {loan_id}")
        db.execute(
            "SELECT id FROM loans WHERE id = %s AND user_id = %s",
            (loan_id, current_user["id"]),
        )
        if not db.fetchone():
            logger.warning(f"Loan ID: {loan_id} not found for user {current_user['username']}")
            raise HTTPException(status_code=404, detail="Loan not found")

        # Get transaction details before deletion
        db.execute(
            "SELECT transaction_type, amount FROM loan_transactions WHERE id = %s AND loan_id = %s",
            (transaction_id, loan_id),
        )
        transaction = db.fetchone()
        if not transaction:
            logger.warning(f"Transaction ID: {transaction_id} not found for loan ID: {loan_id}")
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Delete transaction
        db.execute(
            "DELETE FROM loan_transactions WHERE id = %s AND loan_id = %s",
            (transaction_id, loan_id),
        )

        # Reverse the balance change
        if transaction["transaction_type"] == "payment":
            logger.info(f"Reversing payment for loan ID: {loan_id}")
            # Reverse payment: add amount back to balance
            db.execute(
                "UPDATE loans SET current_balance = current_balance + %s WHERE id = %s",
                (transaction["amount"], loan_id),
            )
        elif transaction["transaction_type"] == "interest":
            logger.info(f"Reversing interest for loan ID: {loan_id}")
            # Reverse interest: subtract amount from balance
            db.execute(
                "UPDATE loans SET current_balance = current_balance - %s WHERE id = %s",
                (transaction["amount"], loan_id),
            )
        elif transaction["transaction_type"] == "adjustment":
            logger.info(f"Reversing adjustment for loan ID: {loan_id}")
            # Reverse adjustment: subtract amount from balance
            db.execute(
                "UPDATE loans SET current_balance = current_balance - %s WHERE id = %s",
                (transaction["amount"], loan_id),
            )   
        
        logger.info(f"Successfully deleted transaction ID: {transaction_id} from loan ID: {loan_id}")

        return {"message": "Transaction deleted successfully"}

    except HTTPException:
        logger.error(f"HTTPException raised while deleting transaction ID: {transaction_id} from loan ID: {loan_id}")
        raise
    except Exception as e:
        logger.error(f"Error deleting loan transaction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete loan transaction")
