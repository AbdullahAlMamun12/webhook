import json
from channels.generic.websocket import AsyncWebsocketConsumer

class WebhookConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.group_name = f"logs_{self.session_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def new_webhook(self, event):
        await self.send(text_data=json.dumps(event["data"]))


class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({"message": "✅ Connected to Test WebSocket!"}))

    async def receive(self, text_data):
        await self.send(text_data=json.dumps({"data": text_data}))