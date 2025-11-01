import psycopg2
import psycopg2.extras
from core import config

def get_db():
    conn = psycopg2.connect(
        dbname=config.database.DB_NAME,
        user=config.database.DB_USER,
        password=config.database.DB_PASSWORD,
        host=config.database.DB_HOST,
        port=config.database.DB_PORT,
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield cur
        conn.commit()
    finally:
        cur.close()
        conn.close()
