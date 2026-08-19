from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SiteContent

class ContentView(APIView):
    authentication_classes = [] # Allow simple access for admin for now
    permission_classes = []

    def get(self, request):
        # Return content in format: { "ru": { "key": "val" }, "uz": { "key": "val" } }
        contents = SiteContent.objects.all()
        ru_data = {}
        uz_data = {}
        
        for c in contents:
            ru_data[c.key] = c.value_ru
            uz_data[c.key] = c.value_uz
            
        return Response({
            "ru": ru_data,
            "uz": uz_data
        })

    def put(self, request):
        # Expected payload: { "lang": "ru", "data": { "key1": "value1", "key2": "value2" } }
        lang = request.data.get('lang')
        data = request.data.get('data')
        
        if lang not in ['ru', 'uz']:
            return Response({"error": "Invalid language"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not isinstance(data, dict):
            return Response({"error": "Data must be a dictionary"}, status=status.HTTP_400_BAD_REQUEST)
            
        for key, value in data.items():
            obj, created = SiteContent.objects.get_or_create(key=key)
            if lang == 'ru':
                obj.value_ru = value
            elif lang == 'uz':
                obj.value_uz = value
            obj.save()
            
        return Response({"status": "success"})
