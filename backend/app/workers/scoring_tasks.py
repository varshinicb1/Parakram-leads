from app.workers.celery_app import celery_app


@celery_app.task
def test_worker():
    return {"status": "ok", "message": "Sigma worker is running"}
