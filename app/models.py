from django.db import models
import uuid
from .utils import humanize_bytes

class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # 🔥 Custom response fields
    response_status = models.IntegerField(default=200)
    response_headers = models.JSONField(default=dict, blank=True)
    response_body = models.TextField(default='')
    url = models.TextField(default='{"status": "ok"}')

class RequestData:
    def __init__(self, headers=None, body=None, query_params=None, size=0):

        self.headers = headers or {}
        self.body = body
        self.query_params = query_params or {}
        self.size = size

    def to_dict(self):
        return {
            'headers': dict(self.headers),
            'body': self.body.decode('utf-8') if isinstance(self.body, bytes) else self.body,
            'query_params': self.query_params,
            'size': humanize_bytes(self.size)
        }

class ResponseData:
    def __init__(self, headers=None, body=None, size=0):
        self.headers = headers or {}
        self.body = body
        self.size = size

    def to_dict(self):
        return {
            'headers': dict(self.headers),
            'body': self.body.decode('utf-8') if isinstance(self.body, bytes) else self.body,
            'size': humanize_bytes(self.size)
        }

class RequestInfo:
    def __init__(self, method: str, path: str, request_data: RequestData, response_data: ResponseData):
        self.method = method
        self.path = path
        self.request = request_data
        self.response = response_data

    def to_dict(self):
        return {
            'method': self.method,
            'path': self.path,
            'request': self.request.to_dict(),
            'response': self.response.to_dict()
        }


class WebhookRequest(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    method = models.CharField(max_length=10)
    headers = models.JSONField()
    body = models.TextField()
    request_size = models.PositiveIntegerField(null=True, blank=True)  # Add this field
    response_size = models.PositiveIntegerField(null=True, blank=True)  # Add this field
    query_params = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)