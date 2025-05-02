from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/logs/(?P<session_id>[0-9a-f-]+)/$', consumers.WebhookConsumer.as_asgi()),
    re_path(r'ws/test/$', consumers.TestConsumer.as_asgi()),  # ✅ Added
]