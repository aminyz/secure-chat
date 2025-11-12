from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserKey
from .serializers import UserKeySerializer
from django.shortcuts import get_object_or_404

class UploadPublicKey(APIView):
    def post(self, request):
        username = request.data.get('username')
        public_key_b64 = request.data.get('public_key_b64')
        if not username or not public_key_b64:
            return Response({"detail":"username and public_key_b64 required"}, status=status.HTTP_400_BAD_REQUEST)
        obj, created = UserKey.objects.update_or_create(
            username=username,
            defaults={"public_key_b64": public_key_b64}
        )
        return Response(UserKeySerializer(obj).data)

class GetPublicKey(APIView):
    def get(self, request, username):
        obj = get_object_or_404(UserKey, username=username)
        return Response(UserKeySerializer(obj).data)
