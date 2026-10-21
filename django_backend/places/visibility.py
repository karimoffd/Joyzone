from .models import Place


PUBLIC_PLACE_STATUS = 'approved'


def publicly_visible_places(queryset=None):
    """Return the shared public place scope used by catalog and purchase flows."""
    queryset = queryset if queryset is not None else Place.objects.all()
    return queryset.filter(status=PUBLIC_PLACE_STATUS)


def is_place_publicly_visible(place):
    return bool(place and place.pk and place.status == PUBLIC_PLACE_STATUS)
