from flask import Flask, request, jsonify
from flask_cors import CORS
import bcrypt
import os
from dotenv import load_dotenv
from pathlib import Path
import random
from datetime import datetime

# Importar módulos locales
from database import (
    init_database, 
    find_user, 
    upsert_user, 
    store_token, 
    find_active_token, 
    mark_token_used
)
from email_service import send_recovery_email

# Cargar variables de entorno
load_dotenv()

# Inicializar Flask
app = Flask(__name__)

# Configuración
PORT = int(os.getenv('PORT', 3001))
FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', '*')
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')

# Configurar CORS
allow_all_origins = not FRONTEND_ORIGIN or FRONTEND_ORIGIN == '*'
if allow_all_origins:
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    allowed_origins = [origin.strip() for origin in FRONTEND_ORIGIN.split(',') if origin.strip()]
    CORS(app, resources={r"/*": {"origins": allowed_origins}})

# Inicializar base de datos
init_database()


# --- Utilidades ---

def generate_token() -> str:
    """Genera un token de 6 dígitos."""
    return str(random.randint(100000, 999999))


def validate_token(email: str, token: str) -> dict:
    """
    Valida un token de recuperación.
    
    Returns:
        dict con 'valid' (bool) y 'reason' (str) si es inválido
    """
    entry = find_active_token(email)
    
    if not entry:
        return {'valid': False, 'reason': 'No hay solicitudes activas.'}
    
    # Verificar expiración
    current_time = int(datetime.now().timestamp() * 1000)
    if current_time > entry['expires_at']:
        return {'valid': False, 'reason': 'El código expiró.'}
    
    # Verificar token
    token_bytes = token.encode('utf-8')
    hash_bytes = entry['token_hash'].encode('utf-8')
    
    if not bcrypt.checkpw(token_bytes, hash_bytes):
        return {'valid': False, 'reason': 'Código incorrecto.'}
    
    return {'valid': True, 'entry': entry}


# --- Rutas ---

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud."""
    return jsonify({'status': 'ok'}), 200


@app.route('/auth/recovery', methods=['POST'])
def recovery():
    """Endpoint para solicitar recuperación de contraseña."""
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Datos requeridos.'}), 400
    
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'message': 'Correo requerido.'}), 400
    
    # Generar token
    token = generate_token()
    token_hash = bcrypt.hashpw(token.encode('utf-8'), bcrypt.gensalt(8)).decode('utf-8')
    
    # Calcular expiración (10 minutos en milisegundos)
    expires_at = int(datetime.now().timestamp() * 1000) + (10 * 60 * 1000)
    
    # Guardar token
    store_token(email, token_hash, expires_at)
    
    # Enviar correo
    try:
        success = send_recovery_email(email, token)
        if success:
            return jsonify({
                'message': 'Hemos enviado un correo con tu código de recuperación.'
            }), 200
        else:
            return jsonify({
                'message': 'No se pudo enviar el correo. Revisa la configuración SMTP en el backend.'
            }), 500
    except Exception as e:
        print(f"Error enviando correo de recuperación: {e}")
        return jsonify({
            'message': 'No se pudo enviar el correo. Revisa la configuración SMTP en el backend.'
        }), 500


@app.route('/auth/reset', methods=['POST'])
def reset_password():
    """Endpoint para restablecer contraseña con token."""
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Datos requeridos.'}), 400
    
    email = data.get('email', '').strip().lower()
    token = data.get('token', '').strip()
    new_password = data.get('newPassword', '').strip()
    
    # Validar datos
    if not email or not token or not new_password:
        return jsonify({'message': 'Datos incompletos.'}), 400
    
    if len(new_password) < 8:
        return jsonify({'message': 'La contraseña debe tener al menos 8 caracteres.'}), 400
    
    # Validar token
    validation = validate_token(email, token)
    if not validation['valid']:
        return jsonify({'message': validation['reason']}), 400
    
    # Actualizar contraseña
    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    upsert_user(email, new_hash)
    
    # Marcar token como usado
    mark_token_used(email)
    
    return jsonify({'message': 'Contraseña actualizada correctamente.'}), 200


@app.route('/auth/register', methods=['POST'])
def register():
    """Endpoint para registro de usuarios."""
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Datos requeridos.'}), 400
        
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    role = data.get('role', 'student').strip()
    
    if not email or not password:
        return jsonify({'message': 'Correo y contraseña requeridos.'}), 400
        
    if len(password) < 8:
        return jsonify({'message': 'La contraseña debe tener al menos 8 caracteres.'}), 400
        
    # Hashear contraseña
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    
    # Crear usuario
    from database import create_user
    if create_user(email, password_hash, role):
        return jsonify({'message': 'Usuario registrado correctamente.', 'role': role}), 201
    else:
        return jsonify({'message': 'El correo ya está registrado.'}), 409


@app.route('/auth/login', methods=['POST'])
def login():
    """Endpoint para inicio de sesión."""
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Datos requeridos.'}), 400
        
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({'message': 'Correo y contraseña requeridos.'}), 400
        
    user = find_user(email)
    
    if not user:
        return jsonify({'message': 'Credenciales inválidas.'}), 401
        
    # Verificar contraseña
    if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({
            'message': 'Inicio de sesión exitoso.',
            'user': {
                'email': user['email'],
                'role': user['role']
            }
        }), 200
    else:
        return jsonify({'message': 'Credenciales inválidas.'}), 401


@app.route('/auth/change-password', methods=['POST'])
def change_password():
    """Endpoint para cambiar contraseña (usuario autenticado)."""
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Datos requeridos.'}), 400
        
    email = data.get('email', '').strip().lower()
    current_password = data.get('currentPassword', '').strip()
    new_password = data.get('newPassword', '').strip()
    
    if not email or not current_password or not new_password:
        return jsonify({'message': 'Todos los campos son requeridos.'}), 400
        
    if len(new_password) < 8:
        return jsonify({'message': 'La nueva contraseña debe tener al menos 8 caracteres.'}), 400
        
    user = find_user(email)
    
    if not user:
        return jsonify({'message': 'Usuario no encontrado.'}), 404
        
    # Verificar contraseña actual
    if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'message': 'La contraseña actual es incorrecta.'}), 401
        
    # Actualizar contraseña
    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    
    # Usamos upsert_user que ya maneja la actualización
    upsert_user(email, new_hash)
    
    return jsonify({'message': 'Contraseña actualizada correctamente.'}), 200


@app.route('/test', methods=['GET'])
def test_route():
    return jsonify({'message': 'Test OK'}), 200

@app.route('/auth/change_password', methods=['POST'])
def change_password_underscore():
    return jsonify({'message': 'Underscore OK'}), 200



# --- Punto de entrada ---

if __name__ == '__main__':
    print(f"🚀 EduQuiz Recovery API (Python) escuchando en http://localhost:{PORT}")
    print(f"📊 Base de datos: SQLite")
    print(f"🌐 CORS: {FRONTEND_ORIGIN}")
    print("🛣️ Rutas registradas:")
    print(app.url_map)
    
    # Modo debug solo en desarrollo
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=PORT, debug=debug_mode)
