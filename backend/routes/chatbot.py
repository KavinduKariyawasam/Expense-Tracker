import logging
import os
from datetime import datetime

from auth import get_current_user
from src.chatbot import agent
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.chatbot.agent import expense_tracker_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chatbot_route = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Pydantic models
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str

# Initialize the agent (will be created per request to maintain user context)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


@chatbot_route.post("/chat", response_model=ChatResponse)
async def chat_with_bot(
    chat_message: ChatMessage,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Chat with the expense tracker AI assistant using multi-provider agent with tools
    """
    try:
        logger.info(f"User {current_user['username']} initiated chat with message: {chat_message.message}")
        response_text = expense_tracker_agent.chat(chat_message.message)
        
        return ChatResponse(
            response=response_text,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error in chatbot: {e}")
        raise HTTPException(
            status_code=500,
            detail="Sorry, I'm having trouble processing your request right now. Please try again later."
        )


@chatbot_route.get("/health")
async def chatbot_health():
    """Check if chatbot service is available"""
    try:
        # Test with a simple message
        test_response = agent.chat("Hello")
        
        return {
            "status": "healthy", 
            "model": GROQ_MODEL,
            "agent_type": "Multi-Provider Agent",
            "test_response_length": len(test_response)
        }
    except Exception as e:
        logger.error(f"Chatbot health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}