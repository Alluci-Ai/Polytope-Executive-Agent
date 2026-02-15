
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from ..config import load_settings

settings = load_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    # Default to 24 hours for local sovereign agent usage
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.POLYTOPE_MASTER_KEY, algorithm="HS256")
    return encoded_jwt

async def verify_authenticated(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify signature using the Sovereign Master Key
        payload = jwt.decode(token, settings.POLYTOPE_MASTER_KEY, algorithms=["HS256"])
        if payload.get("sub") != "sovereign_admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return True
