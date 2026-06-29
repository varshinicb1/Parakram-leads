from app.workers.celery_app import celery_app, run_async
from app.database import async_session_factory
from app.models.lead import Lead
from app.models.message import Message, MessageChannel, MessageStatus
from app.services.communicator import send_message
from app.services.job_engine import JobEngine
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3)
def send_outreach_task(self, lead_id: str, channel: str):
    async def _run():
        async with async_session_factory() as db:
            job = await JobEngine.get_by_celery_task_id(db, self.request.id)

            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                if job:
                    await JobEngine.fail(db, str(job.id), error="Lead not found")
                return {"error": "Lead not found"}

            if job:
                await JobEngine.update(db, str(job.id), status="RUNNING", progress=20)

            if not lead.outreach_approved:
                if job:
                    await JobEngine.fail(db, str(job.id), error="Outreach not approved")
                return {"error": "Outreach not approved"}

            if job:
                await JobEngine.update(db, str(job.id), progress=40)

            channel_map = {
                "whatsapp": (MessageChannel.WHATSAPP, lead.outreach_message_whatsapp),
                "email": (MessageChannel.EMAIL, lead.outreach_message_email),
                "linkedin": (MessageChannel.LINKEDIN, lead.outreach_message_linkedin),
            }

            if channel not in channel_map:
                if job:
                    await JobEngine.fail(db, str(job.id), error=f"Invalid channel: {channel}")
                return {"error": f"Invalid channel: {channel}"}

            msg_channel, content = channel_map[channel]
            if not content:
                if job:
                    await JobEngine.fail(db, str(job.id), error=f"No content for channel: {channel}")
                return {"error": f"No content for channel: {channel}"}

            if job:
                await JobEngine.update(db, str(job.id), progress=70)

            message = await send_message(lead, msg_channel, content, db)

            result = {
                "message_id": str(message.id),
                "status": message.status,
                "channel": channel,
            }
            if job:
                await JobEngine.complete(db, str(job.id), result=result)
            return result

    return run_async(_run())
