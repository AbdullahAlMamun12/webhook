from django.db import models
import uuid

class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # 🔥 Custom response fields
    response_status = models.IntegerField(default=200)
    response_headers = models.JSONField(default=dict, blank=True)
    response_body = models.TextField(default='{"status": "ok"}')

class WebhookRequest(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    method = models.CharField(max_length=10)
    headers = models.JSONField()
    body = models.TextField()
    query_params = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)