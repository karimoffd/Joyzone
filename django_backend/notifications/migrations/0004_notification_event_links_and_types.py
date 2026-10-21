from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('notifications', '0003_chatthread_guest_chatthread_host_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='related_booking_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='related_tariff_subscription_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('booking_created', 'Booking Created'),
                    ('booking_paid', 'Booking Paid'),
                    ('booking_confirmed', 'Booking Confirmed'),
                    ('booking_cancelled', 'Booking Cancelled'),
                    ('booking_blocked', 'Booking Blocked'),
                    ('tariff_activated', 'Tariff Activated'),
                    ('place_approved', 'Place Approved'),
                    ('place_rejected', 'Place Rejected'),
                    ('place_submitted', 'New Place Submitted'),
                    ('system', 'System'),
                ],
                default='system',
                max_length=30,
            ),
        ),
    ]
