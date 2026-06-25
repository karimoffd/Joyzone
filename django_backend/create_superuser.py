import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User

# Check if superuser already exists
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@joyzone.uz', 'joyzoneadmin2026')
    print("Superuser created successfully (username: admin, password: joyzoneadmin2026)")
else:
    print("Superuser 'admin' already exists.")
