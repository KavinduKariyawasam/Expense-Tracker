import logging
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from auth import get_current_user
from database import get_db
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from schemas import BillData
from utils import run_ocr_only_bytes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bill_route = APIRouter(tags=["bill"])


@bill_route.post("/upload-bill")
async def upload_bill(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Upload and parse a bill/invoice image or PDF"""
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PNG, JPG, JPEG, or PDF file.",
        )

    try:
        file_bytes = await file.read()
        parsed_data = run_ocr_only_bytes(file_bytes, extension=extension)

        return {
            "success": True,
            "filename": file.filename,
            "parsed_data": parsed_data,
            "message": "Bill parsed successfully",
        }

    except Exception as e:
        logger.error(f"Error processing bill: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the file: {str(e)}",
        )


# Update the save_bill_expenses endpoint
@bill_route.post("/save-bill-expenses")
def save_bill_expenses(
    bill_data: BillData, db=Depends(get_db), current_user=Depends(get_current_user)
):
    """Save parsed bill data as individual expenses for each item"""
    try:
        saved_expenses = []

        # Parse the invoice date
        try:
            expense_date = (
                date.fromisoformat(bill_data.invoice_date)
                if bill_data.invoice_date
                else date.today()
            )
        except ValueError:
            expense_date = date.today()

        # Save each item as a separate expense
        for item in bill_data.items:
            # Convert to Decimal for precise calculations
            quantity = Decimal(str(item.quantity)).quantize(
                Decimal("0.001"), rounding=ROUND_HALF_UP
            )
            unit_price = Decimal(str(item.unit_price)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            line_total = Decimal(str(item.line_total)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            # Insert expense for this item
            db.execute(
                """
                INSERT INTO expenses (user_id, vendor, description, amount, category, expense_date) 
                VALUES (%s, %s, %s, %s, %s, %s) 
                RETURNING id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at
            """,
                (
                    current_user["id"],
                    bill_data.vendor,
                    item.description,
                    float(line_total),
                    item.category if hasattr(item, "category") else "Others",
                    expense_date,
                ),
            )

            new_expense = db.fetchone()
            expense_id = new_expense["id"]

            # Insert the item details
            db.execute(
                """
                INSERT INTO expense_items (expense_id, description, quantity, unit_price, line_total) 
                VALUES (%s, %s, %s, %s, %s) 
                RETURNING id, description, quantity, unit_price, line_total, created_at
            """,
                (
                    expense_id,
                    item.description,
                    float(quantity),
                    float(unit_price),
                    float(line_total),
                ),
            )

            item_details = db.fetchone()

            # Add the expense with its item to results
            expense_with_items = {**new_expense, "items": [item_details]}
            saved_expenses.append(expense_with_items)

        return {
            "message": f"Successfully saved {len(saved_expenses)} expenses",
            "expenses": saved_expenses,
            "total_amount": sum(float(exp["amount"]) for exp in saved_expenses),
        }

    except Exception as e:
        logger.error(f"Error saving bill expenses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save bill expenses")
