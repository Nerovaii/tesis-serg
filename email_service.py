import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


def create_smtp_connection():
    """Crea una conexión SMTP basada en las variables de entorno."""
    smtp_host = os.getenv('SMTP_HOST', '')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_secure = os.getenv('SMTP_SECURE', 'false').lower() == 'true'
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    
    if not smtp_user or not smtp_pass:
        raise ValueError("Faltan variables SMTP_USER/SMTP_PASS para enviar correos.")
    
    # Detectar si es Gmail
    is_gmail = not smtp_host or 'gmail' in smtp_host.lower()
    
    if is_gmail:
        smtp_host = 'smtp.gmail.com'
        smtp_port = 587
    
    # Crear conexión
    if smtp_secure and smtp_port == 465:
        # SSL directo
        server = smtplib.SMTP_SSL(smtp_host, smtp_port)
    else:
        # TLS (STARTTLS)
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
    
    server.login(smtp_user, smtp_pass)
    return server


def send_recovery_email(to: str, token: str) -> bool:
    """
    Envía un correo de recuperación de contraseña.
    
    Args:
        to: Email del destinatario
        token: Token de recuperación de 6 dígitos
    
    Returns:
        True si el correo se envió correctamente, False en caso contrario
    """
    try:
        from_email = os.getenv('EMAIL_FROM', 'soporte@eduquiz.local')
        reply_to = os.getenv('EMAIL_REPLY_TO', from_email)
        
        # Crear mensaje
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Recuperar contraseña - EduQuiz'
        msg['From'] = from_email
        msg['To'] = to
        msg['Reply-To'] = reply_to
        
        # Cuerpo del mensaje
        text_body = f"""Hola,

Recibimos una solicitud para restablecer tu contraseña en EduQuiz.

Código temporal: {token}
Vigencia: 10 minutos.

Ingresa a la página de inicio de sesión y pega este código para restablecer tu contraseña.

Si no solicitaste este cambio, ignora este mensaje.

---
EduQuiz - Sistema de Evaluación Educativa
"""
        
        # Versión HTML (opcional, más bonita)
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4a90e2;">Recuperación de Contraseña</h2>
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña en <strong>EduQuiz</strong>.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Código temporal:</strong></p>
                <p style="font-size: 24px; font-weight: bold; color: #4a90e2; margin: 10px 0; letter-spacing: 2px;">{token}</p>
                <p style="margin: 0; font-size: 14px; color: #666;">Vigencia: 10 minutos</p>
              </div>
              
              <p>Ingresa a la página de inicio de sesión y pega este código para restablecer tu contraseña.</p>
              <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignora este mensaje.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="font-size: 12px; color: #999;">EduQuiz - Sistema de Evaluación Educativa</p>
            </div>
          </body>
        </html>
        """
        
        # Adjuntar ambas versiones
        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # Enviar
        server = create_smtp_connection()
        server.send_message(msg)
        server.quit()
        
        print(f"✓ Correo de recuperación enviado a {to}")
        return True
        
    except Exception as e:
        print(f"✗ Error enviando correo a {to}: {e}")
        return False


def test_smtp_connection() -> bool:
    """Prueba la conexión SMTP sin enviar correo."""
    try:
        server = create_smtp_connection()
        server.quit()
        print("✓ Conexión SMTP exitosa")
        return True
    except Exception as e:
        print(f"✗ Error en conexión SMTP: {e}")
        return False
