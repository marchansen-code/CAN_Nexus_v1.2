"""
Email service for CANUSA Nexus notifications.
Handles SMTP email sending for various notification types.
"""
import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor
import asyncio

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", 587))
        self.smtp_username = os.environ.get("SMTP_USERNAME", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.sender_name = os.environ.get("SMTP_SENDER_NAME", "CANUSA Nexus")
        self.app_url = os.environ.get("APP_URL", "https://nexus-knows.de")
        self.executor = ThreadPoolExecutor(max_workers=3)
    
    def _create_connection(self):
        """Establish secure SMTP connection"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            return server
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            raise ValueError("Ungültige SMTP-Anmeldedaten") from e
        except smtplib.SMTPException as e:
            logger.error(f"SMTP connection failed: {e}")
            raise RuntimeError("SMTP-Verbindung fehlgeschlagen") from e
    
    def _build_html_email(self, recipient: str, subject: str, body_html: str) -> MIMEMultipart:
        """Build HTML email with proper headers and styling"""
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = f"{self.sender_name} <{self.smtp_username}>"
        message['To'] = recipient
        
        # Full HTML template
        full_html = f"""
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background-color: #1e3a5f; color: #ffffff; padding: 20px 30px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600;">CANUSA Nexus</h1>
        </div>
        <div style="padding: 30px;">
            {body_html}
        </div>
        <div style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; padding: 15px 30px; text-align: center; font-size: 12px; color: #6c757d;">
            <p style="margin: 0;">Diese E-Mail wurde automatisch von CANUSA Nexus generiert.</p>
            <p style="margin: 5px 0 0 0;">© 2026 CANUSA Touristik GmbH & Co. KG</p>
        </div>
    </div>
</body>
</html>
"""
        message.attach(MIMEText(full_html, 'html', _charset='utf-8'))
        return message
    
    def send_email(self, recipient: str, subject: str, body_html: str) -> bool:
        """Send email synchronously"""
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured, skipping email")
            return False
        
        try:
            message = self._build_html_email(recipient, subject, body_html)
            server = self._create_connection()
            try:
                server.sendmail(self.smtp_username, [recipient], message.as_string())
                logger.info(f"Email sent successfully to {recipient}")
                return True
            finally:
                server.quit()
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            return False
    
    async def send_email_async(self, recipient: str, subject: str, body_html: str) -> bool:
        """Send email asynchronously without blocking event loop"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self.send_email,
            recipient, subject, body_html
        )
    
    # ==================== NOTIFICATION TYPES ====================
    
    async def send_mention_notification(
        self, 
        recipient_email: str, 
        recipient_name: str,
        mentioner_name: str,
        article_title: str,
        article_id: str
    ) -> bool:
        """Send notification when user is @mentioned in an article"""
        article_url = f"{self.app_url}/articles/{article_id}"
        body_html = f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Sie wurden erwähnt!</h2>
        <p>Hallo <strong>{recipient_name}</strong>,</p>
        <p><strong>{mentioner_name}</strong> hat Sie in einem Artikel erwähnt:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0;">{article_title}</p>
        </div>
        <p>
            <a href="{article_url}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Artikel ansehen</a>
        </p>
        """
        return await self.send_email_async(
            recipient_email,
            f"Sie wurden in \"{article_title}\" erwähnt",
            body_html
        )
    
    async def send_review_request(
        self,
        recipient_email: str,
        recipient_name: str,
        requester_name: str,
        article_title: str,
        article_id: str
    ) -> bool:
        """Send review request notification for an article"""
        article_url = f"{self.app_url}/articles/{article_id}"
        body_html = f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Review-Anfrage</h2>
        <p>Hallo <strong>{recipient_name}</strong>,</p>
        <p><strong>{requester_name}</strong> bittet Sie um eine Überprüfung des folgenden Artikels:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0;">{article_title}</p>
            <p style="font-size: 13px; color: #856404; margin: 5px 0 0 0;">⚠️ Dies ist ein Entwurf - Sie haben temporäre Leseberechtigung erhalten.</p>
        </div>
        <p>
            <a href="{article_url}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Artikel überprüfen</a>
        </p>
        """
        return await self.send_email_async(
            recipient_email,
            f"Review-Anfrage: \"{article_title}\"",
            body_html
        )
    
    async def send_favorite_update_notification(
        self,
        recipient_email: str,
        recipient_name: str,
        article_title: str,
        article_id: str,
        change_type: str,
        changer_name: str
    ) -> bool:
        """Send notification when a favorited article is updated"""
        article_url = f"{self.app_url}/articles/{article_id}"
        
        change_descriptions = {
            "content": "Der Inhalt wurde aktualisiert",
            "comment": "Ein neuer Kommentar wurde hinzugefügt",
            "status": "Der Status wurde geändert"
        }
        change_text = change_descriptions.get(change_type, "Es wurden Änderungen vorgenommen")
        
        body_html = f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Aktualisierung eines Favoriten</h2>
        <p>Hallo <strong>{recipient_name}</strong>,</p>
        <p>Ein Artikel in Ihren Favoriten wurde aktualisiert:</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0;">⭐ {article_title}</p>
            <p style="font-size: 13px; color: #155724; margin: 5px 0 0 0;">{change_text} von {changer_name}</p>
        </div>
        <p>
            <a href="{article_url}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Artikel ansehen</a>
        </p>
        """
        return await self.send_email_async(
            recipient_email,
            f"Update: \"{article_title}\"",
            body_html
        )
    
    async def send_status_change_notification(
        self,
        recipient_email: str,
        recipient_name: str,
        old_role: str,
        new_role: str,
        is_blocked: Optional[bool] = None,
        changed_by: str = "Administrator"
    ) -> bool:
        """Send notification when user's role or status is changed"""
        role_names = {
            "admin": "Administrator",
            "editor": "Editor",
            "viewer": "Leser"
        }
        
        if is_blocked is not None:
            if is_blocked:
                status_text = "Ihr Konto wurde gesperrt."
                status_color = "#dc3545"
                icon = "🔒"
            else:
                status_text = "Ihr Konto wurde entsperrt."
                status_color = "#28a745"
                icon = "🔓"
        else:
            old_role_name = role_names.get(old_role, old_role)
            new_role_name = role_names.get(new_role, new_role)
            status_text = f"Ihre Rolle wurde von <strong>{old_role_name}</strong> zu <strong>{new_role_name}</strong> geändert."
            status_color = "#17a2b8"
            icon = "👤"
        
        body_html = f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Statusänderung</h2>
        <p>Hallo <strong>{recipient_name}</strong>,</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid {status_color};">
            <p style="font-size: 18px; margin: 0;">{icon} {status_text}</p>
        </div>
        <p style="color: #6c757d; font-size: 13px;">Diese Änderung wurde von {changed_by} vorgenommen.</p>
        <p>
            <a href="{self.app_url}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Zu CANUSA Nexus</a>
        </p>
        """
        
        subject = "Ihr Konto wurde gesperrt" if is_blocked else ("Ihr Konto wurde entsperrt" if is_blocked is False else "Ihre Benutzerrolle wurde geändert")
        
        return await self.send_email_async(recipient_email, subject, body_html)
    
    async def send_contact_person_notification(
        self,
        recipient_email: str,
        recipient_name: str,
        article_title: str,
        article_id: str,
        assigned_by: str
    ) -> bool:
        """Send notification when user is assigned as contact person for an article"""
        article_url = f"{self.app_url}/articles/{article_id}"
        body_html = f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Neue Zuständigkeit</h2>
        <p>Hallo <strong>{recipient_name}</strong>,</p>
        <p>Sie wurden als <strong>Ansprechpartner</strong> für den folgenden Artikel festgelegt:</p>
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3498db;">
            <p style="font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0;">📋 {article_title}</p>
            <p style="font-size: 13px; color: #0056b3; margin: 5px 0 0 0;">Zugewiesen von {assigned_by}</p>
        </div>
        <p>Als Ansprechpartner sind Sie die primäre Kontaktperson für Fragen zu diesem Artikel.</p>
        <p>
            <a href="{article_url}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Artikel ansehen</a>
        </p>
        """
        return await self.send_email_async(
            recipient_email,
            f"Sie sind Ansprechpartner für \"{article_title}\"",
            body_html
        )


# Singleton instance
email_service = EmailService()
