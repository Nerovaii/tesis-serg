# EduQuiz Backend - Python/Flask + SQLite

Backend de autenticación y recuperación de contraseñas para EduQuiz, migrado de Node.js a Python.

## 🚀 Características

- ✅ API REST con Flask
- ✅ Base de datos SQLite
- ✅ Autenticación con bcrypt
- ✅ Sistema de tokens de recuperación (6 dígitos, 10 minutos de vigencia)
- ✅ Envío de correos con SMTP
- ✅ Migración automática desde `db.json`
- ✅ CORS configurable

## 📋 Requisitos

- Python 3.8 o superior
- pip (gestor de paquetes de Python)

## 🔧 Instalación

1. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar variables de entorno:**
   
   Copia el archivo `.env.example` a `.env` y configura tus credenciales SMTP:
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus datos:
   ```env
   PORT=3001
   FRONTEND_ORIGIN=http://localhost:3000
   
   # Configuración SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_contraseña_de_aplicación
   EMAIL_FROM="EduQuiz Soporte" <tu_email@gmail.com>
   EMAIL_REPLY_TO=tu_email@gmail.com
   
   BASE_URL=http://localhost:3000
   ```

   > **Nota para Gmail:** Necesitas generar una "Contraseña de aplicación" en tu cuenta de Google. [Más información aquí](https://support.google.com/accounts/answer/185833).

3. **Ejecutar el servidor:**
   ```bash
   python server.py
   ```

   El servidor estará disponible en `http://localhost:3001`

## 📁 Estructura de Archivos

```
desarroolloooo/
├── server.py              # Servidor Flask principal
├── database.py            # Gestión de SQLite
├── email_service.py       # Envío de correos
├── requirements.txt       # Dependencias Python
├── .env                   # Variables de entorno (no incluir en git)
├── .env.example          # Plantilla de configuración
├── data/
│   ├── eduquiz.db        # Base de datos SQLite (se crea automáticamente)
│   └── db.json           # Datos antiguos (se migran automáticamente)
└── [archivos HTML/CSS/JS del frontend]
```

## 🔌 API Endpoints

### `GET /health`
Verifica el estado del servidor.

**Respuesta:**
```json
{
  "status": "ok"
}
```

### `POST /auth/recovery`
Solicita un código de recuperación de contraseña.

**Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Hemos enviado un correo con tu código de recuperación."
}
```

### `POST /auth/reset`
Restablece la contraseña usando el código recibido.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456",
  "newPassword": "NuevaContraseña123"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Contraseña actualizada correctamente."
}
```

## 🔄 Migración desde Node.js

La migración es **automática**:

1. Al iniciar el servidor Python por primera vez, detecta si existe `data/db.json`
2. Si existe y la base de datos SQLite está vacía, migra todos los usuarios y tokens
3. Los datos quedan almacenados en `data/eduquiz.db`
4. El archivo `db.json` se mantiene como respaldo

**No necesitas hacer nada manualmente.**

## 🗄️ Base de Datos

### Tabla `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `tokens`
```sql
CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Pruebas

### Probar el servidor:
```bash
# Health check
curl http://localhost:3001/health

# Solicitar recuperación
curl -X POST http://localhost:3001/auth/recovery \
  -H "Content-Type: application/json" \
  -d '{"email":"estudiante@colegio.com"}'
```

### Probar conexión SMTP:
Puedes agregar esta función en `server.py` temporalmente:
```python
from email_service import test_smtp_connection
test_smtp_connection()
```

## 🔐 Seguridad

- Las contraseñas se hashean con bcrypt (10 rounds)
- Los tokens se hashean con bcrypt (8 rounds)
- Los tokens expiran en 10 minutos
- Los tokens solo se pueden usar una vez
- CORS configurable por origen

## 📝 Notas

- **Puerto por defecto:** 3001 (configurable en `.env`)
- **Modo debug:** Solo activo si `FLASK_ENV=development`
- **CORS:** Por defecto permite todos los orígenes (`*`), configura `FRONTEND_ORIGIN` para restringir

## 🆚 Comparación con Node.js

| Característica | Node.js | Python |
|----------------|---------|--------|
| Framework | Express | Flask |
| Base de datos | JSON file | SQLite |
| Hash | bcryptjs | bcrypt |
| Correos | nodemailer | smtplib |
| Config | dotenv | python-dotenv |

## 🐛 Troubleshooting

### Error: "Faltan variables SMTP_USER/SMTP_PASS"
Asegúrate de tener configurado el archivo `.env` con tus credenciales SMTP.

### Error: "No se pudo enviar el correo"
- Verifica que las credenciales SMTP sean correctas
- Para Gmail, usa una "Contraseña de aplicación", no tu contraseña normal
- Verifica que el puerto sea 587 para TLS o 465 para SSL

### La base de datos no se crea
Verifica que el directorio `data/` tenga permisos de escritura.

## 📞 Soporte

Para problemas o preguntas, revisa los logs del servidor en la consola.
