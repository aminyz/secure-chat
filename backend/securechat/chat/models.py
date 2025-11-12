from django.db import models

class UserKey(models.Model):
    username = models.CharField(max_length=150, unique=True)
    public_key_b64 = models.TextField()  # store exported public key (base64)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username
