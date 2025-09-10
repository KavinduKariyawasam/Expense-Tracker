import logging
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from psycopg2 import sql
from typing import List
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from database import get_db
from security import get_password_hash, verify_password, create_access_token
from schemas import UserCreate, UserOut, Token, ExpenseCreate, ExpenseOut, ExpenseUpdate, BillData
from auth import get_current_user
from utils import run_ocr_only_bytes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db=Depends(get_db)):
    # 1. Check for existing email
    db.execute("SELECT id FROM users WHERE email = %s", (user.email,))
    if db.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")
    # 2. Hash password & insert
    hashed_pw = get_password_hash(user.password)
    db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email",
        (user.username, user.email, hashed_pw)
    )
    new_user = db.fetchone()
    return new_user

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    logger.info(f"Login attempt - Email: {form_data.username}")
    
    # Note: form_data.username holds the "username" field, we'll use it for email
    db.execute("SELECT id, username, email, password_hash FROM users WHERE email = %s", (form_data.username,))
    user = db.fetchone()
    
    if not user:
        logger.info("User not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"User found: {user['email']}")
    
    if not verify_password(form_data.password, user["password_hash"]):
        logger.info("Password verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info("Login successful, creating token")
    token = create_access_token(data={"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

# Expense endpoints
@app.post("/expenses", response_model=ExpenseOut)
def create_expense(expense: ExpenseCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new expense"""
    try:
        # Insert expense
        db.execute("""
            INSERT INTO expenses (user_id, vendor, description, amount, category, expense_date) 
            VALUES (%s, %s, %s, %s, %s, %s) 
            RETURNING id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at
        """, (current_user["id"], expense.vendor, expense.description, expense.amount, expense.category, expense.expense_date))
        
        new_expense = db.fetchone()
        expense_id = new_expense["id"]
        
        # Insert expense items if provided
        items = []
        if expense.items:
            for item in expense.items:
                db.execute("""
                    INSERT INTO expense_items (expense_id, description, quantity, unit_price, line_total) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING id, description, quantity, unit_price, line_total, created_at
                """, (expense_id, item.description, item.quantity, item.unit_price, item.line_total))
                items.append(db.fetchone())
        
        # Return expense with items
        return {**new_expense, "items": items}
        
    except Exception as e:
        logger.error(f"Error creating expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create expense")

@app.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(db=Depends(get_db), current_user=Depends(get_current_user), skip: int = 0, limit: int = 100):
    """Get user's expenses"""
    try:
        # Get expenses
        db.execute("""
            SELECT id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at 
            FROM expenses 
            WHERE user_id = %s 
            ORDER BY expense_date DESC, created_at DESC 
            LIMIT %s OFFSET %s
        """, (current_user["id"], limit, skip))
        
        expenses = db.fetchall()
        
        # Get items for each expense
        result = []
        for expense in expenses:
            db.execute("""
                SELECT id, description, quantity, unit_price, line_total, created_at 
                FROM expense_items 
                WHERE expense_id = %s
            """, (expense["id"],))
            items = db.fetchall()
            result.append({**expense, "items": items})
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting expenses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get expenses")

@app.get("/expenses/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get specific expense"""
    try:
        # Get expense
        db.execute("""
            SELECT id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at 
            FROM expenses 
            WHERE id = %s AND user_id = %s
        """, (expense_id, current_user["id"]))
        
        expense = db.fetchone()
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Get items
        db.execute("""
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM expense_items 
            WHERE expense_id = %s
        """, (expense_id,))
        items = db.fetchall()
        
        return {**expense, "items": items}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get expense")

@app.put("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, expense: ExpenseUpdate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update expense"""
    try:
        # Check if expense exists and belongs to user
        db.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, current_user["id"]))
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
        db.execute("""
            SELECT id, description, quantity, unit_price, line_total, created_at 
            FROM expense_items 
            WHERE expense_id = %s
        """, (expense_id,))
        items = db.fetchall()
        
        return {**updated_expense, "items": items}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update expense")

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Delete expense"""
    try:
        # Check if expense exists and belongs to user
        db.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, current_user["id"]))
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Delete expense (items will be deleted by cascade)
        db.execute("DELETE FROM expenses WHERE id = %s AND user_id = %s", (expense_id, current_user["id"]))
        
        return {"message": "Expense deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete expense")

@app.post("/upload-bill")
async def upload_bill(file: UploadFile = File(...), current_user=Depends(get_current_user), db=Depends(get_db)):
    """Upload and parse a bill/invoice image or PDF"""
    extension = file.filename.split('.')[-1].lower()
    if extension not in ['png', 'jpg', 'jpeg', 'pdf']:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PNG, JPG, JPEG, or PDF file."
        )
    
    try:
        file_bytes = await file.read()
        parsed_data = run_ocr_only_bytes(file_bytes, extension=extension)
        
        return {
            "success": True,
            "filename": file.filename,
            "parsed_data": parsed_data,
            "message": "Bill parsed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error processing bill: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the file: {str(e)}"
        )

# Update the save_bill_expenses endpoint
@app.post("/save-bill-expenses")
def save_bill_expenses(bill_data: BillData, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Save parsed bill data as individual expenses for each item"""
    try:
        saved_expenses = []
        
        # Parse the invoice date
        try:
            expense_date = date.fromisoformat(bill_data.invoice_date) if bill_data.invoice_date else date.today()
        except ValueError:
            expense_date = date.today()
        
        # Save each item as a separate expense
        for item in bill_data.items:
            # Convert to Decimal for precise calculations
            quantity = Decimal(str(item.quantity)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
            unit_price = Decimal(str(item.unit_price)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            line_total = Decimal(str(item.line_total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Insert expense for this item
            db.execute("""
                INSERT INTO expenses (user_id, vendor, description, amount, category, expense_date) 
                VALUES (%s, %s, %s, %s, %s, %s) 
                RETURNING id, user_id, vendor, description, amount, category, expense_date, created_at, updated_at
            """, (
                current_user["id"], 
                bill_data.vendor, 
                item.description,
                float(line_total),
                item.category if hasattr(item, 'category') else 'Others',
                expense_date
            ))
            
            new_expense = db.fetchone()
            expense_id = new_expense["id"]
            
            # Insert the item details
            db.execute("""
                INSERT INTO expense_items (expense_id, description, quantity, unit_price, line_total) 
                VALUES (%s, %s, %s, %s, %s) 
                RETURNING id, description, quantity, unit_price, line_total, created_at
            """, (expense_id, item.description, float(quantity), float(unit_price), float(line_total)))
            
            item_details = db.fetchone()
            
            # Add the expense with its item to results
            expense_with_items = {**new_expense, "items": [item_details]}
            saved_expenses.append(expense_with_items)
        
        return {
            "message": f"Successfully saved {len(saved_expenses)} expenses",
            "expenses": saved_expenses,
            "total_amount": sum(float(exp["amount"]) for exp in saved_expenses)
        }
        
    except Exception as e:
        logger.error(f"Error saving bill expenses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save bill expenses")

@app.get("/me")
def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"]
    }

@app.get("/dashboard-stats")
def get_dashboard_stats(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get dashboard statistics"""
    try:
        user_id = current_user["id"]
        
        # Total expenses
        db.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_expenses,
                   COUNT(*) as total_transactions
            FROM expenses 
            WHERE user_id = %s
        """, (user_id,))
        total_result = db.fetchone()
        
        # Monthly expenses (current month)
        current_month = datetime.now().replace(day=1)
        db.execute("""
            SELECT COALESCE(SUM(amount), 0) as monthly_expenses,
                   COUNT(*) as monthly_transactions
            FROM expenses 
            WHERE user_id = %s AND expense_date >= %s
        """, (user_id, current_month.date()))
        monthly_result = db.fetchone()
        
        # Categories count
        db.execute("""
            SELECT COUNT(DISTINCT category) as categories_count
            FROM expenses 
            WHERE user_id = %s AND category IS NOT NULL
        """, (user_id,))
        categories_result = db.fetchone()
        
        # Recent transactions count (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        db.execute("""
            SELECT COUNT(*) as recent_transactions
            FROM expenses 
            WHERE user_id = %s AND created_at >= %s
        """, (user_id, week_ago))
        recent_result = db.fetchone()
        
        return {
            "total_expenses": float(total_result["total_expenses"] or 0),
            "monthly_expenses": float(monthly_result["monthly_expenses"] or 0),
            "total_categories": int(categories_result["categories_count"] or 0),
            "recent_transactions": int(recent_result["recent_transactions"] or 0),
            "total_transactions": int(total_result["total_transactions"] or 0)
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard stats")

@app.get("/yearly-stats/{year}")
def get_yearly_stats(year: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get yearly statistics with monthly breakdown"""
    try:
        user_id = current_user["id"]
        
        # Get monthly breakdown for the year
        db.execute("""
            SELECT 
                EXTRACT(MONTH FROM expense_date) as month,
                COALESCE(SUM(amount), 0) as month_total,
                COUNT(*) as month_transactions
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
            GROUP BY EXTRACT(MONTH FROM expense_date)
            ORDER BY EXTRACT(MONTH FROM expense_date)
        """, (user_id, year))
        
        monthly_data = db.fetchall()
        
        # Get total for the year
        db.execute("""
            SELECT 
                COALESCE(SUM(amount), 0) as year_total,
                COUNT(*) as year_transactions,
                COUNT(DISTINCT category) as year_categories
            FROM expenses 
            WHERE user_id = %s 
                AND EXTRACT(YEAR FROM expense_date) = %s
        """, (user_id, year))
        
        year_totals = db.fetchone()
        
        # Initialize all 12 months with zero values
        monthly_breakdown = []
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        # Create a dictionary for easy lookup
        monthly_dict = {int(row["month"]): row for row in monthly_data}
        
        # Build complete monthly breakdown
        for month_num in range(1, 13):
            month_data = monthly_dict.get(month_num, {"month_total": 0, "month_transactions": 0})
            monthly_breakdown.append({
                "month": month_num,
                "month_name": month_names[month_num - 1],
                "total": float(month_data["month_total"]),
                "transactions": int(month_data["month_transactions"])
            })
        
        year_total = float(year_totals["year_total"] or 0)
        avg_monthly = year_total / 12 if year_total > 0 else 0
        
        return {
            "year": year,
            "monthly_breakdown": monthly_breakdown,
            "year_total": year_total,
            "year_transactions": int(year_totals["year_transactions"] or 0),
            "year_categories": int(year_totals["year_categories"] or 0),
            "avg_monthly": round(avg_monthly, 2)
        }
        
    except Exception as e:
        logger.error(f"Error getting yearly stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get yearly stats")

@app.get("/available-years")
def get_available_years(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get years that have expense data"""
    try:
        user_id = current_user["id"]
        
        db.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM expense_date) as year
            FROM expenses 
            WHERE user_id = %s
            ORDER BY year DESC
        """, (user_id,))
        
        years = [int(row["year"]) for row in db.fetchall()]
        
        # If no data, include current year
        if not years:
            years = [datetime.now().year]
        
        return {"years": years}
        
    except Exception as e:
        logger.error(f"Error getting available years: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get available years")
