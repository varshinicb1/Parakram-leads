from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.lead import Lead
from app.models.message import Message, MessageChannel, MessageStatus
from app.services.communicator import send_message
from sqlalchemy import select
import asyncio


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def send_outreach_task(self, lead_id: str, channel: str):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                return {"error": "Lead not found"}

            if not lead.outreach_approved:
                return {"error": "Outreach not approved"}

            channel_map = {
                "whatsapp": (MessageChannel.WHATSAPP, lead.outreach_message_whatsapp),
                "email": (MessageChannel.EMAIL, lead.outreach_message_email),
                "linkedin": (MessageChannel.LINKEDIN, lead.outreach_message_linkedin),
            }

            if channel not in channel_map:
                return {"error": f"Invalid channel: {channel}"}

            msg_channel, content = channel_map[channel]
            if not content:
                return {"error": f"No content for channel: {channel}"}

            message = await send_message(lead, msg_channel, content, db)
            return {
                "message_id": str(message.id),
                "status": message.status,
                "channel": channel,
            }

    return run_async(_run())
