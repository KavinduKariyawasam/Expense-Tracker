import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    DB_NAME = os.getenv("DB_NAME", "expense_tracker")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", 5432)


class OCRConfig:
    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "your_mistral_api_key")
    OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "your_ocr_space_api_key")

class LLMConfig:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your_groq_api_key")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "your_groq_model")
    

class JWTConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))


class AppConfig:
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

class Config:
    database = DatabaseConfig
    llm = LLMConfig
    ocr = OCRConfig
    security = JWTConfig
    app = AppConfig

config = Config()
