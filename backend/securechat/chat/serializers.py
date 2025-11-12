from rest_framework import serializers
from .models import UserKey

class UserKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserKey
        fields = ['username', 'public_key_b64', 'updated_at']
