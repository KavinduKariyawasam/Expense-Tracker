from dotenv import load_dotenv
from logger import get_logger

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

# Load environment variables from .env file
load_dotenv()

logger = get_logger(__name__)


def create_app():
    logger.info("Creating FastAPI application")
    app = FastAPI()

    logger.info("Including routers")
    app.include_router(expense_route)
    app.include_router(income_route)
    app.include_router(stats_route)
    app.include_router(bill_route)
    app.include_router(auth_route)
    app.include_router(loan_route)
    app.include_router(chatbot_route)
    
    logger.info("Setting up CORS middleware")

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # React dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    logger.info("FastAPI application created successfully")
    return app

app = create_app()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
