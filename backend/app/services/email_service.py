"""Email service with SendGrid primary, SMTP fallback, and tracking pixel support."""

import logging
import smtplib
import ssl
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def _inject_tracking_pixel(html_body: str, tracking_id: Optional[str]) -> str:
    """Inject a tracking pixel before the closing </body> tag if tracking_id is provided."""
    if not tracking_id:
        return html_body
    base_url = settings.EMAIL_TRACKING_BASE_URL.rstrip("/")
    pixel = (
        f'<img src="{base_url}/api/v1/webhooks/email/track/{tracking_id}" '
        f'width="1" height="1" />'
    )
    if "</body>" in html_body:
        return html_body.replace("</body>", f"{pixel}</body>")
    # Fallback: append pixel at the end
    return f"{html_body}{pixel}"


class EmailProvider(ABC):
    """Abstract base class for email providers."""

    @abstractmethod
    async def send(
        self,
        to: str,
        subject: str,
        html_body: str,
        tracking_id: str = None,
    ) -> Optional[str]:
        """Send an email and return the external message_id (or None).

        Args:
            to: Recipient email address.
            subject: Email subject line.
            html_body: HTML content of the email.
            tracking_id: Optional tracking identifier for open-tracking pixel.

        Returns:
            The external message_id returned by the provider, or None if the
            provider does not supply one.
        """
        ...


class SendGridProvider(EmailProvider):
    """Email provider using the SendGrid API."""

    async def send(
        self,
        to: str,
        subject: str,
        html_body: str,
        tracking_id: str = None,
    ) -> Optional[str]:
        """Send an email via SendGrid and return the message_id from response headers.

        Args:
            to: Recipient email address.
            subject: Email subject line.
            html_body: HTML content of the email.
            tracking_id: Optional tracking identifier for open-tracking pixel.

        Returns:
            The SendGrid message_id from the response X-Message-Id header, or
            None on failure.
        """
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        try:
            html_body = _inject_tracking_pixel(html_body, tracking_id)

            message = Mail(
                from_email=settings.SMTP_FROM,
                to_emails=to,
                subject=subject,
                html_content=html_body,
            )

            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)

            if response.status_code in (200, 201, 202):
                message_id = response.headers.get("X-Message-Id")
                logger.info(
                    "SendGrid email sent to %s (status=%s, message_id=%s)",
                    to,
                    response.status_code,
                    message_id,
                )
                return message_id

            logger.error(
                "SendGrid email failed to %s: status=%s body=%s",
                to,
                response.status_code,
                response.body,
            )
            return None

        except Exception as e:
            logger.error("SendGrid email error for %s: %s", to, e)
            return None


class SMTPProvider(EmailProvider):
    """Email provider using SMTP with TLS (fallback)."""

    async def send(
        self,
        to: str,
        subject: str,
        html_body: str,
        tracking_id: str = None,
    ) -> Optional[str]:
        """Send an email via SMTP with TLS and return None (no external message_id).

        Args:
            to: Recipient email address.
            subject: Email subject line.
            html_body: HTML content of the email.
            tracking_id: Optional tracking identifier for open-tracking pixel.

        Returns:
            None — SMTP does not provide an external message_id.
        """
        try:
            html_body = _inject_tracking_pixel(html_body, tracking_id)

            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, to, msg.as_string())

            logger.info("SMTP email sent to %s", to)
            return None

        except Exception as e:
            logger.error("SMTP email error for %s: %s", to, e)
            return None


def get_email_provider() -> EmailProvider:
    """Return the best available email provider.

    Returns SendGridProvider if SENDGRID_API_KEY is configured, otherwise
    falls back to SMTPProvider.
    """
    if settings.SENDGRID_API_KEY:
        logger.debug("Using SendGrid email provider")
        return SendGridProvider()
    logger.debug("Using SMTP email provider (fallback)")
    return SMTPProvider()
