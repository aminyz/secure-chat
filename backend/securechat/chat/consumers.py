# backend/securechat/chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # room name را از URL بگیر
        self.room_name = self.scope['url_route']['kwargs'].get('room_name', 'testroom')
        self.room_group_name = f"chat_{self.room_name}"

        # عضو گروه شو
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # پیام سیستمی فقط برای همین کلاینتِ جدید
        await self.send(text_data=json.dumps({"type": "system", "message": "connected to server"}))

    async def disconnect(self, close_code):
        # از گروه خارج شو
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """
        انتظار داریم فرانت JSON ارسال کند.
        ما فقط آن را به گروه فوروارد می‌کنیم (بدون دستکاری محتوا).
        """
        try:
            data = json.loads(text_data)
        except Exception:
            # اگر نتوانستیم JSON بخوانیم، پیام را به صورت متن باز هم ارسال کنیم
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "chat.message", "message": {"type":"text","message": text_data}}
            )
            return

        # فوروارد به همه اعضای گروه
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": data  # فوروارد همان JSON (شامل ciphertext یا fields دلخواه)
            }
        )

    async def chat_message(self, event):
        # این تابع توسط channel_layer فراخوانی می‌شود تا پیام را برای WS ارسال کند
        message = event["message"]
        await self.send(text_data=json.dumps(message))
