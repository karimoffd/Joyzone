from .models import Notification


BOOKING_COPY = {
    'booking_created': {
        'client': ('Бронирование создано', 'Ваша заявка на «{place}» создана и ожидает обработки.'),
        'owner': ('Новая бронь', 'По объекту «{place}» создана новая заявка на бронирование.'),
    },
    'booking_paid': {
        'client': ('Оплата принята', 'Тестовая оплата бронирования «{place}» успешно проведена.'),
        'owner': ('Бронь оплачена', 'Бронирование объекта «{place}» оплачено через тестового провайдера.'),
    },
    'booking_confirmed': {
        'client': ('Бронирование подтверждено', 'Бронирование «{place}» подтверждено.'),
        'owner': ('Бронь подтверждена', 'Бронирование объекта «{place}» подтверждено.'),
    },
    'booking_cancelled': {
        'client': ('Бронирование отменено', 'Бронирование «{place}» отменено.'),
        'owner': ('Бронь отменена', 'Бронирование объекта «{place}» отменено.'),
    },
    'booking_blocked': {
        'client': ('Период заблокирован', 'Период по объекту «{place}» заблокирован.'),
        'owner': ('Период заблокирован', 'Период по объекту «{place}» добавлен в календарь как заблокированный.'),
    },
}


def create_system_notification(
    *,
    user,
    notification_type,
    title_ru,
    message_ru,
    title_uz='',
    title_en='',
    message_uz='',
    message_en='',
    related_place_id=None,
    related_booking_id=None,
    related_tariff_subscription_id=None,
):
    if not user:
        return None
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title_ru=title_ru,
        title_uz=title_uz,
        title_en=title_en,
        message_ru=message_ru,
        message_uz=message_uz,
        message_en=message_en,
        related_place_id=related_place_id,
        related_booking_id=related_booking_id,
        related_tariff_subscription_id=related_tariff_subscription_id,
    )


def notify_booking_event(booking, notification_type, actor=None, include_actor=False):
    if notification_type not in BOOKING_COPY:
        raise ValueError(f'Unsupported booking notification type: {notification_type}')

    place = booking.place
    candidates = (
        ('client', booking.client),
        ('owner', place.owner),
    )
    created_for = set()
    notifications = []
    for audience, recipient in candidates:
        if not recipient or recipient.id in created_for:
            continue
        if actor and recipient.id == actor.id and not include_actor:
            continue
        title, message = BOOKING_COPY[notification_type][audience]
        notifications.append(create_system_notification(
            user=recipient,
            notification_type=notification_type,
            title_ru=title,
            message_ru=message.format(place=place.title),
            related_place_id=place.id,
            related_booking_id=booking.id,
        ))
        created_for.add(recipient.id)
    return notifications


def notify_tariff_activated(subscription):
    tariff_name = subscription.tariff.name if subscription.tariff else 'Joyzone'
    return create_system_notification(
        user=subscription.partner,
        notification_type='tariff_activated',
        title_ru='Тариф активирован',
        message_ru=f'Тариф «{tariff_name}» активирован и доступен в кабинете партнёра.',
        related_tariff_subscription_id=subscription.id,
    )
