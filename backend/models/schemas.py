from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, validator


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
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# Expense Item schemas
class ExpenseItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    line_total: float
    category: Optional[str] = "Others"

    @validator("quantity", "unit_price", "line_total")
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

    @validator("amount")
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


# Income Item schemas
class IncomeItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    line_total: float
    category: Optional[str] = "Others"

    @validator("quantity", "unit_price", "line_total")
    def validate_decimals(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)


class IncomeItemOut(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    line_total: float
    created_at: datetime

    class Config:
        from_attributes = True


# Income schemas
class IncomeCreate(BaseModel):
    source: Optional[str] = None
    description: str
    amount: float
    category: Optional[str] = None
    income_date: date
    items: Optional[List["IncomeItemCreate"]] = []

    @validator("amount")
    def validate_amount(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)


class IncomeOut(BaseModel):
    id: int
    user_id: int
    source: Optional[str]
    description: str
    amount: float
    category: Optional[str]
    income_date: date
    created_at: datetime
    updated_at: datetime
    items: List[IncomeItemOut] = []

    class Config:
        from_attributes = True


class IncomeUpdate(BaseModel):
    source: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    income_date: Optional[date] = None


# Bill processing schema
class BillData(BaseModel):
    vendor: str
    invoice_date: str
    items: List[ExpenseItemCreate]
    invoice_total: float

    @validator("invoice_total")
    def validate_total(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)


# Update forward references
IncomeCreate.update_forward_refs()


# Loan Transaction schemas
class LoanTransactionCreate(BaseModel):
    transaction_type: str  # 'payment', 'interest', 'adjustment'
    amount: float
    transaction_date: date
    description: Optional[str] = None

    @validator("amount")
    def validate_amount(cls, v):
        if v is None:
            return 0.0
        return round(float(v), 2)

    @validator("transaction_type")
    def validate_transaction_type(cls, v):
        allowed_types = ["payment", "interest", "adjustment"]
        if v not in allowed_types:
            raise ValueError(f"Transaction type must be one of: {allowed_types}")
        return v


class LoanTransactionOut(BaseModel):
    id: int
    loan_id: int
    transaction_type: str
    amount: float
    transaction_date: date
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Loan schemas
class LoanCreate(BaseModel):
    type: str  # 'given' or 'received'
    person_name: str
    person_contact: Optional[str] = None
    principal_amount: float
    interest_rate: Optional[float] = 0.0
    loan_date: date
    due_date: Optional[date] = None
    description: Optional[str] = None

    @validator("principal_amount")
    def validate_principal_amount(cls, v):
        if v is None or v <= 0:
            raise ValueError("Principal amount must be greater than 0")
        return round(float(v), 2)

    @validator("interest_rate")
    def validate_interest_rate(cls, v):
        if v is None:
            return 0.0
        if v < 0:
            raise ValueError("Interest rate cannot be negative")
        return round(float(v), 2)

    @validator("type")
    def validate_type(cls, v):
        allowed_types = ["given", "received"]
        if v not in allowed_types:
            raise ValueError(f"Loan type must be one of: {allowed_types}")
        return v


class LoanOut(BaseModel):
    id: int
    user_id: int
    type: str
    person_name: str
    person_contact: Optional[str]
    principal_amount: float
    current_balance: float
    interest_rate: float
    loan_date: date
    due_date: Optional[date]
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    transactions: List[LoanTransactionOut] = []

    class Config:
        from_attributes = True


class LoanUpdate(BaseModel):
    person_name: Optional[str] = None
    person_contact: Optional[str] = None
    interest_rate: Optional[float] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None

    @validator("interest_rate")
    def validate_interest_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError("Interest rate cannot be negative")
        return v

    @validator("status")
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ["active", "completed", "overdue", "cancelled"]
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of: {allowed_statuses}")
        return v


class LoanSummary(BaseModel):
    total_loans_given: float
    total_loans_received: float
    total_outstanding_given: float
    total_outstanding_received: float
    active_loans_given: int
    active_loans_received: int
    overdue_loans_given: int
    overdue_loans_received: int


# Investment Transaction schemas
class InvestmentTransactionCreate(BaseModel):
    transaction_type: str  # 'buy', 'sell', 'dividend', 'split', 'bonus', 'fee'
    amount: float
    shares: Optional[float] = None
    price_per_share: Optional[float] = None
    transaction_date: date
    description: Optional[str] = None
    fees: Optional[float] = 0.0

    @validator("amount", "shares", "price_per_share", "fees")
    def validate_decimals(cls, v):
        if v is None:
            return v
        return round(float(v), 2)

    @validator("transaction_type")
    def validate_transaction_type(cls, v):
        allowed_types = ["buy", "sell", "dividend", "split", "bonus", "fee", "adjustment"]
        if v not in allowed_types:
            raise ValueError(f"Transaction type must be one of: {allowed_types}")
        return v


class InvestmentTransactionOut(BaseModel):
    id: int
    investment_id: int
    transaction_type: str
    amount: float
    shares: Optional[float]
    price_per_share: Optional[float]
    transaction_date: date
    description: Optional[str]
    fees: float
    created_at: datetime

    class Config:
        from_attributes = True


# Investment schemas
class InvestmentCreate(BaseModel):
    name: str
    type: str  # 'stocks', 'bonds', 'mutual_funds', 'etf', 'crypto', 'real_estate', 'fixed_deposit', 'other'
    description: Optional[str] = None
    initial_amount: float
    current_value: Optional[float] = None
    purchase_date: date
    platform: Optional[str] = None
    currency: Optional[str] = "LKR"
    status: Optional[str] = "active"

    @validator("initial_amount", "current_value")
    def validate_amounts(cls, v):
        if v is None:
            return v
        if v < 0:
            raise ValueError("Amount cannot be negative")
        return round(float(v), 2)

    @validator("type")
    def validate_type(cls, v):
        allowed_types = ["stocks", "bonds", "mutual_funds", "etf", "crypto", "real_estate", "fixed_deposit", "other"]
        if v not in allowed_types:
            raise ValueError(f"Investment type must be one of: {allowed_types}")
        return v

    @validator("status")
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ["active", "sold", "matured", "cancelled"]
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of: {allowed_statuses}")
        return v


class InvestmentOut(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    description: Optional[str]
    initial_amount: float
    current_value: float
    purchase_date: date
    platform: Optional[str]
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime
    transactions: List[InvestmentTransactionOut] = []

    class Config:
        from_attributes = True


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    current_value: Optional[float] = None
    platform: Optional[str] = None
    status: Optional[str] = None

    @validator("current_value")
    def validate_current_value(cls, v):
        if v is not None and v < 0:
            raise ValueError("Current value cannot be negative")
        return v

    @validator("type")
    def validate_type(cls, v):
        if v is not None:
            allowed_types = ["stocks", "bonds", "mutual_funds", "etf", "crypto", "real_estate", "fixed_deposit", "other"]
            if v not in allowed_types:
                raise ValueError(f"Investment type must be one of: {allowed_types}")
        return v

    @validator("status")
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ["active", "sold", "matured", "cancelled"]
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of: {allowed_statuses}")
        return v


class InvestmentSummary(BaseModel):
    total_investments: int
    total_invested: float
    current_total_value: float
    total_gain_loss: float
    total_gain_loss_percentage: float
    by_type: dict = {}
    by_status: dict = {}
