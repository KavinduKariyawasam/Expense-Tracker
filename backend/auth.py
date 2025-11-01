from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from database import get_db
from core import config


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, config.security.SECRET_KEY, algorithms=[config.security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # db is already a RealDictCursor, use it directly
    db.execute("SELECT id, username, email FROM users WHERE email = %s", (email,))
    user = db.fetchone()
    if user is None:
        raise credentials_exception

    # RealDictCursor returns dict-like objects, so we can access by key
    return {"id": user["id"], "username": user["username"], "email": user["email"]}
