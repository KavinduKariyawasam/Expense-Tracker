from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

# User schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Expense Item schemas
class ExpenseItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    line_total: float
    category: Optional[str] = 'Others'

    @validator('quantity', 'unit_price', 'line_total')
    def validate_decimals(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)

class ExpenseItemOut(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    line_total: float
    created_at: datetime

    class Config:
        from_attributes = True

# Expense schemas
class ExpenseCreate(BaseModel):
    vendor: Optional[str] = None
    description: str
    amount: float
    category: Optional[str] = None
    expense_date: date
    items: Optional[List[ExpenseItemCreate]] = []

    @validator('amount')
    def validate_amount(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)

class ExpenseOut(BaseModel):
    id: int
    user_id: int
    vendor: Optional[str]
    description: str
    amount: float
    category: Optional[str]
    expense_date: date
    created_at: datetime
    updated_at: datetime
    items: List[ExpenseItemOut] = []

    class Config:
        from_attributes = True

class ExpenseUpdate(BaseModel):
    vendor: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_date: Optional[date] = None

# Bill processing schema
class BillData(BaseModel):
    vendor: str
    invoice_date: str
    items: List[ExpenseItemCreate]
    invoice_total: float

    @validator('invoice_total')
    def validate_total(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)
