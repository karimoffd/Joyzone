import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a dedicated non-privileged account in an isolated public demo database.'

    def add_arguments(self, parser):
        parser.add_argument('--role', choices=('client', 'partner'), default='client')
        parser.add_argument(
            '--acknowledge-isolated-database',
            action='store_true',
            help='Confirm that the active database is dedicated to disposable public demo data.',
        )

    def handle(self, *args, **options):
        if not settings.PUBLIC_DEMO_DATA_ISOLATED:
            raise CommandError('PUBLIC_DEMO_DATA_ISOLATED=True is required.')
        if not options['acknowledge_isolated_database']:
            raise CommandError('--acknowledge-isolated-database is required.')

        prefix = settings.PUBLIC_DEMO_ACCOUNT_PREFIX
        if not prefix:
            raise CommandError('PUBLIC_DEMO_ACCOUNT_PREFIX must not be empty.')

        User = get_user_model()
        while True:
            username = f'{prefix}{options["role"]}_{secrets.token_hex(6)}'
            if not User.objects.filter(username=username).exists():
                break

        password = secrets.token_urlsafe(24)
        user = User.objects.create_user(
            username=username,
            password=password,
            role=options['role'],
            is_staff=False,
            is_superuser=False,
            first_name='Public demo',
        )

        self.stdout.write(self.style.SUCCESS(f'Created public demo {user.role} account.'))
        self.stdout.write(f'account={username}')
        self.stdout.write(f'password={password}')
        self.stdout.write(
            'Store the credential securely, add only the account name to '
            'PUBLIC_DEMO_ACCOUNT_USERNAMES, and do not place either value in the frontend bundle.'
        )
