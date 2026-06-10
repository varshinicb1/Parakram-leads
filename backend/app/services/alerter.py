import httpx
import smtplib
import ssl
from email.mime.text import MIMEText
from app.config import settings
from app.models.lead import Lead
from app.models.alert import Alert
from datetime import datetime


ALERT_MESSAGE_TEMPLATE = """High Priority Lead Response

Business: {business_name}
Contact: {owner_name}
Phone: {phone}
Email: {email}

Response: {response}

Opportunity Score: {opportunity_score}/100
Category: {category}
"""


async def send_personal_alert(lead: Lead, response_text: str):
    message_text = ALERT_MESSAGE_TEMPLATE.format(
        business_name=lead.business_name,
        owner_name=lead.owner_name or "Unknown",
        phone=lead.phone or "Unknown",
        email=lead.email or "Unknown",
        response=response_text,
        opportunity_score=lead.opportunity_score,
        category=lead.category_flag,
    )

    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.PERSONAL_ALERT_PHONE:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            async with httpx.AsyncClient(timeout=15) as client:
                await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={
                        "From": settings.TWILIO_PHONE_NUMBER,
                        "To": settings.PERSONAL_ALERT_PHONE,
                        "Body": message_text[:1600],
                    },
                )
        except Exception:
            pass

    if settings.SMTP_HOST and settings.SMTP_USER and settings.PERSONAL_ALERT_EMAIL:
        try:
            msg = MIMEText(message_text)
            msg["Subject"] = "Sigma Lead Alert - High Priority Response"
            msg["From"] = settings.SMTP_FROM
            msg["To"] = settings.PERSONAL_ALERT_EMAIL
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, settings.PERSONAL_ALERT_EMAIL, msg.as_string())
        except Exception:
            pass


async def send_sms_alert(phone: str, message: str):
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            async with httpx.AsyncClient(timeout=15) as client:
                await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={"From": settings.TWILIO_PHONE_NUMBER, "To": phone, "Body": message[:1600]},
                )
        except Exception:
            pass
