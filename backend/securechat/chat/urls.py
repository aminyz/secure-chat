from django.urls import path
from .views import UploadPublicKey, GetPublicKey

urlpatterns = [
    path('keys/upload/', UploadPublicKey.as_view(), name='upload-key'),
    path('keys/<str:username>/', GetPublicKey.as_view(), name='get-key'),
]
