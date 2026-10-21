from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage


IMAGE_EXTENSIONS = {
    'image/jpeg': {'.jpg', '.jpeg'},
    'image/png': {'.png'},
    'image/webp': {'.webp'},
}

CANONICAL_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}


class ImageUploadError(ValueError):
    pass


def _detect_image_content_type(uploaded_file):
    header = uploaded_file.read(16)
    uploaded_file.seek(0)

    if header.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if header.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if header.startswith(b'RIFF') and header[8:12] == b'WEBP':
        return 'image/webp'
    return None


def save_place_image(uploaded_file):
    max_size = settings.MAX_IMAGE_UPLOAD_SIZE
    if uploaded_file.size > max_size:
        max_megabytes = max_size / (1024 * 1024)
        raise ImageUploadError(
            f'Image file is too large. Maximum size is {max_megabytes:g} MB.'
        )

    declared_type = (uploaded_file.content_type or '').split(';', 1)[0].lower()
    original_extension = Path(uploaded_file.name or '').suffix.lower()
    detected_type = _detect_image_content_type(uploaded_file)
    allowed_types = {value.lower() for value in settings.ALLOWED_IMAGE_CONTENT_TYPES}
    allowed_extensions = {
        value.lower() if value.startswith('.') else f'.{value.lower()}'
        for value in settings.ALLOWED_IMAGE_EXTENSIONS
    }

    type_matches = detected_type and declared_type == detected_type
    extension_matches = (
        detected_type
        and original_extension in IMAGE_EXTENSIONS.get(detected_type, set())
    )
    if (
        detected_type not in allowed_types
        or original_extension not in allowed_extensions
        or not type_matches
        or not extension_matches
    ):
        raise ImageUploadError('Unsupported image type. Use JPG, PNG, or WEBP.')

    safe_name = f'uploads/{uuid4().hex}{CANONICAL_EXTENSIONS[detected_type]}'
    stored_name = default_storage.save(safe_name, uploaded_file)
    return default_storage.url(stored_name)
