import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from routes import (
    auth_route,
    bill_route,
    chatbot_route,
    expense_route,
    income_route,
    loan_route,
    stats_route,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


app.include_router(expense_route)
app.include_router(income_route)
app.include_router(stats_route)
app.include_router(bill_route)
app.include_router(auth_route)
app.include_router(loan_route)
app.include_router(chatbot_route)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
