import logging

from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from models.schemas import Token, UserCreate, UserOut
from security import create_access_token, get_password_hash, verify_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

auth_route = APIRouter(tags=["auth"])


@auth_route.post("/register", response_model=UserOut)
def register(user: UserCreate, db=Depends(get_db)):
    logger.info(f"Registering new user: {user.email}")
    
    # 1. Check for existing email
    db.execute("SELECT id FROM users WHERE email = %s", (user.email,))
    
    if db.fetchone():
        logger.info("Email already registered")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash password & insert
    hashed_pw = get_password_hash(user.password)
    logger.info("Inserting new user into database")
    db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email",
        (user.username, user.email, hashed_pw),
    )
    logger.info("User registered successfully")
    new_user = db.fetchone()
    return new_user


@auth_route.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    logger.info(f"Login attempt - Email: {form_data.username}")

    # Note: form_data.username holds the "username" field, we'll use it for email
    db.execute(
        "SELECT id, username, email, password_hash FROM users WHERE email = %s",
        (form_data.username,),
    )
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
