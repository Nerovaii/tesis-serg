import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

# Rutas
DB_PATH = Path(__file__).parent / "data" / "eduquiz.db"
JSON_PATH = Path(__file__).parent / "data" / "db.json"


def get_connection():
    """Obtiene una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Para acceder a columnas por nombre
    return conn


def init_database():
    """Inicializa la base de datos y crea las tablas si no existen."""
    # Crear directorio data si no existe
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Tabla de usuarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Tabla de tokens de recuperación
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            used_at INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Verificar si falta la columna role (migración simple)
    try:
        cursor.execute("SELECT role FROM users LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")
        print("✓ Columna 'role' agregada a la tabla users")
    
    conn.commit()
    conn.close()
    
    # Migrar datos desde JSON si existe y la BD está vacía
    migrate_from_json()


def migrate_from_json():
    """Migra datos desde db.json a SQLite si el archivo existe y la BD está vacía."""
    if not JSON_PATH.exists():
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Verificar si ya hay usuarios
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    
    if user_count > 0:
        conn.close()
        return  # Ya hay datos, no migrar
    
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Migrar usuarios
        for user in data.get('users', []):
            # Asignar rol admin si es el correo de admin conocido, sino student
            role = 'admin' if 'admin' in user['email'] else 'student'
            cursor.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                (user['email'], user['passwordHash'], role)
            )
        
        # Migrar tokens
        for token in data.get('tokens', []):
            cursor.execute(
                "INSERT INTO tokens (email, token_hash, expires_at, used_at) VALUES (?, ?, ?, ?)",
                (token['email'], token['tokenHash'], token['expiresAt'], token.get('usedAt'))
            )
        
        conn.commit()
        print(f"✓ Migrados {len(data.get('users', []))} usuarios y {len(data.get('tokens', []))} tokens desde db.json")
    except Exception as e:
        print(f"Error al migrar desde JSON: {e}")
        conn.rollback()
    finally:
        conn.close()


# --- Funciones para usuarios ---

def find_user(email: str) -> Optional[Dict]:
    """Busca un usuario por email."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER(?)",
        (email,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'id': row['id'],
            'email': row['email'],
            'password_hash': row['password_hash'],
            'role': row['role'],
            'created_at': row['created_at']
        }
    return None


def create_user(email: str, password_hash: str, role: str = 'student') -> bool:
    """Crea un nuevo usuario. Retorna True si se creó, False si ya existe."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            (email, password_hash, role)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def upsert_user(email: str, password_hash: str):
    """Crea o actualiza un usuario (usado en reset password)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            INSERT INTO users (email, password_hash) 
            VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash
            """,
            (email, password_hash)
        )
        conn.commit()
    finally:
        conn.close()
    
    return [{'id': row['id'], 'email': row['email'], 'created_at': row['created_at']} for row in rows]


# --- Funciones para tokens ---

def store_token(email: str, token_hash: str, expires_at: int):
    """Almacena un token de recuperación."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Eliminar tokens anteriores del mismo email
        cursor.execute("DELETE FROM tokens WHERE LOWER(email) = LOWER(?)", (email,))
        
        # Insertar nuevo token
        cursor.execute(
            "INSERT INTO tokens (email, token_hash, expires_at) VALUES (?, ?, ?)",
            (email, token_hash, expires_at)
        )
        conn.commit()
    finally:
        conn.close()


def find_active_token(email: str) -> Optional[Dict]:
    """Busca un token activo (no usado) para un email."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, email, token_hash, expires_at, used_at 
        FROM tokens 
        WHERE LOWER(email) = LOWER(?) AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (email,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'id': row['id'],
            'email': row['email'],
            'token_hash': row['token_hash'],
            'expires_at': row['expires_at'],
            'used_at': row['used_at']
        }
    return None


def mark_token_used(email: str):
    """Marca un token como usado."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        current_time = int(datetime.now().timestamp() * 1000)  # Milisegundos
        cursor.execute(
            "UPDATE tokens SET used_at = ? WHERE LOWER(email) = LOWER(?) AND used_at IS NULL",
            (current_time, email)
        )
        conn.commit()
    finally:
        conn.close()


def cleanup_expired_tokens():
    """Elimina tokens expirados (opcional, para mantenimiento)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        current_time = int(datetime.now().timestamp() * 1000)
        cursor.execute("DELETE FROM tokens WHERE expires_at < ?", (current_time,))
        deleted = cursor.rowcount
        conn.commit()
        return deleted
    finally:
        conn.close()
