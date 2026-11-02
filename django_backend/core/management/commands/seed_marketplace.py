"""Demo listings for every marketplace category (rent and sale).

Run after migrations:  python manage.py seed_marketplace
Listings are matched by title, so running it again updates them in place.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from places.models import Category, Place, SubCategory

IMAGE = 'https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=1200&q=80'

OFFICE = ['1497366811353-6870744d04b2', '1497366216548-37526070297c', '1497215842964-222b430dc094',
          '1431540015161-0bf868a2d407', '1524758631624-e2822e304c36']
OFFICE_2 = ['1497366754035-f200968a6e72', '1497366412874-3415097a27e7', '1556761175-4b46a572b786',
            '1497215842964-222b430dc094', '1524758631624-e2822e304c36']
COWORK = ['1527192491265-7e15c55b1ed2', '1504384308090-c894fdcc538d', '1497366216548-37526070297c',
          '1462826303086-329426d1aef5', '1497366811353-6870744d04b2']
MEETING = ['1517502884422-41eaead166d4', '1431540015161-0bf868a2d407', '1497366811353-6870744d04b2',
           '1524758631624-e2822e304c36', '1497215842964-222b430dc094']
HALL = ['1519167758481-83f550bb49b3', '1464366400600-7168b8af9bc3', '1517502884422-41eaead166d4',
        '1431540015161-0bf868a2d407', '1497366216548-37526070297c']
STUDIO = ['1598488035139-bdbb2231ce04', '1478860409698-8707f313ee8b', '1527192491265-7e15c55b1ed2',
          '1504384308090-c894fdcc538d', '1462826303086-329426d1aef5']
SHOP = ['1441986300917-64674bd600d8', '1555529669-e69e7aa0ba9a', '1567401893414-76b7b1e5a7a5',
        '1604719312566-8912e9227c6a', '1528698827591-e19ccd7bc23d']
CAFE = ['1517248135467-4c7edcad34c4', '1552566626-52f8b828add9', '1441986300917-64674bd600d8',
        '1555529669-e69e7aa0ba9a', '1567401893414-76b7b1e5a7a5']
SALON = ['1560066984-138dadb4c035', '1629909613654-28e377c37b09', '1441986300917-64674bd600d8',
         '1528698827591-e19ccd7bc23d', '1555529669-e69e7aa0ba9a']
CLINIC = ['1629909613654-28e377c37b09', '1519494026892-80bbd2d6fd0d', '1497366754035-f200968a6e72',
          '1497366412874-3415097a27e7', '1556761175-4b46a572b786']
BUILDING = ['1486406146926-c627a92ad1ab', '1545324418-cc1a3fa10c00', '1449157291145-7efd050a4d0e',
            '1497366754035-f200968a6e72', '1497366412874-3415097a27e7']
WAREHOUSE = ['1586528116311-ad8dd3c8310d', '1553413077-190dd305871c', '1565793298595-6a879b1d9492',
             '1601598851547-4302969d0614', '1586528116311-ad8dd3c8310d']

OWNERS = {
    'kamalak_business': ('Kamalak Business', '+998900100101'),
    'bunyod_cowork': ('Bunyod Cowork', '+998900100102'),
    'sharq_events': ('Sharq Events', '+998900100103'),
    'navoiy_office': ('Navoiy Office Park', '+998900100104'),
    'yunusobod_hub': ('Yunusobod Hub', '+998900100105'),
    'samarqand_space': ('Samarqand Space', '+998900100106'),
    'oqtepa_meet': ('Oqtepa Meet', '+998900100107'),
}

TASHKENT = ('41.3111', '69.2797')


def place(owner, sub, title, location, coords, *, deal='rent', images, area, people, uz, ru, en,
          prices=None, sale_price=None, chars=None, amenities=(), promoted=False, booking='request'):
    return dict(
        owner=owner, sub=sub, title=title, location=location, coords=coords, deal=deal, images=images,
        area=area, people=people, uz=uz, ru=ru, en=en, prices=prices or {}, sale_price=sale_price,
        chars=chars or {}, amenities=list(amenities), promoted=promoted, booking=booking,
    )


PLACES = [
    # Ofislar
    place('kamalak_business', 'mini-ofis', 'Yunusobodda tayyor ofis sotiladi',
          "Toshkent, Yunusobod tumani, Amir Temur shoh ko'chasi 107", ('41.3555', '69.2848'),
          deal='sale', sale_price=1850000000, images=OFFICE, area=145, people=25, promoted=True,
          chars={'workplaces': 25, 'rooms': 5, 'floor': 7, 'restrooms': 2, 'meeting_rooms': 1,
                 'renovation': 'tamirlangan', 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'parking', 'access_24_7', 'air_conditioning', 'elevator', 'security'],
          uz="Biznes-markazning 7-qavatida 145 m² ta'mirlangan ofis: 5 ta xona, muzokaralar xonasi va panoramali derazalar. Hujjatlar tayyor.",
          ru='Офис 145 м² с ремонтом на 7 этаже бизнес-центра: 5 кабинетов, переговорная и панорамные окна. Документы готовы.',
          en='Renovated 145 m² office on the 7th floor of a business centre: 5 rooms, a meeting room and panoramic windows.'),
    place('navoiy_office', 'kabinet', 'Mirobodda 2 kishilik alohida kabinet',
          "Toshkent, Mirobod tumani, Shahrisabz ko'chasi 16", ('41.3040', '69.2756'),
          prices={'price_daily': 180000, 'price_monthly': 3200000}, images=OFFICE_2, area=14, people=2,
          chars={'workplaces': 2, 'rooms': 1, 'floor': 3, 'renovation': 'tamirlangan', 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'furniture', 'air_conditioning', 'kitchen', 'reception', 'legal_address'],
          uz="Mebel bilan jihozlangan 14 m² kabinet: 2 ta ish joyi, umumiy oshxona, resepshn va yuridik manzil.",
          ru='Меблированный кабинет 14 м² на двоих: общая кухня, ресепшн и юридический адрес.',
          en='Furnished 14 m² private office for two with a shared kitchen, reception and legal address.'),
    place('kamalak_business', 'open-space-ofis', 'Tashkent City yonida open-space ofis',
          "Toshkent, Shayxontohur tumani, Furqat ko'chasi 5", ('41.3153', '69.2486'),
          prices={'price_monthly': 24000000}, images=OFFICE_2, area=180, people=30, promoted=True,
          chars={'workplaces': 30, 'rooms': 2, 'meeting_rooms': 2, 'restrooms': 2, 'floor': 12,
                 'renovation': 'dizayner', 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'furniture', 'air_conditioning', 'kitchen', 'parking', 'elevator', 'security', 'access_24_7'],
          uz="30 ish joyiga mo'ljallangan 180 m² open-space: 2 ta muzokara xonasi, oshxona va shahar manzarasi.",
          ru='Open space 180 м² на 30 рабочих мест: 2 переговорные, кухня и вид на город.',
          en='180 m² open-space office for 30 people with 2 meeting rooms, a kitchen and a city view.'),
    place('navoiy_office', 'ofis-qavat', 'Chilonzorda biznes-markazning butun qavati',
          "Toshkent, Chilonzor tumani, Bunyodkor shoh ko'chasi 42", ('41.2856', '69.2045'),
          prices={'price_monthly': 52000000}, images=OFFICE, area=420, people=70,
          chars={'workplaces': 70, 'rooms': 12, 'meeting_rooms': 3, 'restrooms': 4, 'floor': 4,
                 'renovation': 'oq-suvoq', 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'parking', 'air_conditioning', 'elevator', 'security', 'separate_entrance'],
          uz="420 m² butun qavat: 12 ta kabinet, 3 ta muzokara xonasi, alohida kirish va 40 o'rinli avtoturargoh.",
          ru='Целый этаж 420 м²: 12 кабинетов, 3 переговорные, отдельный вход и парковка на 40 машин.',
          en='A whole 420 m² floor: 12 offices, 3 meeting rooms, a separate entrance and parking for 40 cars.'),
    place('kamalak_business', 'ofis-binosi', 'Mirzo Ulugbekda 3 qavatli ofis binosi sotiladi',
          "Toshkent, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li ko'chasi 154", ('41.3262', '69.3352'),
          deal='sale', sale_price=9800000000, images=BUILDING, area=860, people=120,
          chars={'workplaces': 120, 'rooms': 28, 'meeting_rooms': 4, 'restrooms': 6, 'floor': 3,
                 'renovation': 'tamirlangan', 'building_type': 'alohida-bino'},
          amenities=['parking', 'security', 'cctv', 'separate_entrance', 'air_conditioning'],
          uz="860 m² alohida ofis binosi: 3 qavat, 28 ta kabinet, o'z hovlisi va avtoturargohi bor.",
          ru='Отдельное офисное здание 860 м²: 3 этажа, 28 кабинетов, свой двор и парковка.',
          en='Standalone 860 m² office building: 3 floors, 28 offices, a private yard and parking.'),
    place('navoiy_office', 'mini-ofis', 'Samarqandda 6 kishilik tayyor ofis',
          "Samarqand, Universitet xiyoboni 9", ('39.6542', '66.9597'),
          prices={'price_daily': 300000, 'price_monthly': 6500000}, images=OFFICE, area=48, people=6,
          chars={'workplaces': 6, 'rooms': 2, 'restrooms': 1, 'floor': 2, 'renovation': 'tamirlangan',
                 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'furniture', 'air_conditioning', 'kitchen', 'legal_address'],
          uz="Markazda 48 m² tayyor ofis: 6 ta ish joyi, mebel va internet bor, kunlik ham ijaraga beriladi.",
          ru='Готовый офис 48 м² в центре: 6 рабочих мест, мебель и интернет, можно посуточно.',
          en='Ready 48 m² office in the centre with 6 desks, furniture and internet; daily rent available.'),
    # Kovorking
    place('yunusobod_hub', 'fixed-desk', 'Yunusobod Hub belgilangan ish joyi',
          "Toshkent, Yunusobod tumani, 4-mavze 12", ('41.3640', '69.2870'),
          prices={'price_weekly': 350000, 'price_monthly': 1200000}, images=COWORK, area=8, people=1,
          chars={'workplaces': 1, 'meeting_rooms': 2},
          amenities=['wifi', 'coffee_tea', 'printer', 'lockers', 'access_24_7', 'legal_address'],
          uz="Sizga biriktirilgan stol, shaxsiy shkafcha va 24/7 kirish. Muzokara xonalari soatiga bepul.",
          ru='Закреплённый стол, личный шкафчик и доступ 24/7. Переговорные — бесплатно по часам.',
          en='Your own desk, a personal locker and 24/7 access. Meeting rooms are free by the hour.'),
    place('bunyod_cowork', 'kovorking-kabinet', 'Chilonzor kovorkingida 4 kishilik kabinet',
          "Toshkent, Chilonzor tumani, Muqimiy ko'chasi 178", ('41.2920', '69.2160'),
          prices={'price_daily': 220000, 'price_monthly': 5200000}, images=COWORK, area=18, people=4,
          chars={'workplaces': 4, 'meeting_rooms': 1},
          amenities=['wifi', 'coffee_tea', 'printer', 'kitchen', 'air_conditioning', 'reception'],
          uz="Kovorking ichidagi yopiq kabinet: 4 ta stol, qahva, printer va resepshn xizmati.",
          ru='Закрытый кабинет внутри коворкинга: 4 стола, кофе, принтер и ресепшн.',
          en='A private room inside the coworking: 4 desks, coffee, printer and reception.'),
    place('yunusobod_hub', 'fokus-xona', "Fokus va Zoom qo'ng'iroqlari xonasi",
          "Toshkent, Yunusobod tumani, 4-mavze 12", ('41.3640', '69.2870'),
          prices={'price_hourly': 35000, 'price_daily': 180000}, images=STUDIO, area=4, people=1, booking='instant',
          chars={'workplaces': 1},
          amenities=['wifi', 'air_conditioning', 'coffee_tea'],
          uz="Ovoz o'tkazmaydigan kabina: onlayn uchrashuv va diqqat talab qiladigan ish uchun.",
          ru='Звукоизолированная кабина для созвонов и работы, где нужна тишина.',
          en='A soundproof booth for calls and focused work.'),
    place('samarqand_space', 'hot-desk', 'Samarqand kovorking, erkin ish joyi',
          "Samarqand, Mirzo Ulug'bek ko'chasi 70", ('39.6600', '66.9440'),
          prices={'price_hourly': 15000, 'price_daily': 60000, 'price_monthly': 900000}, images=COWORK, area=220, people=40,
          booking='instant',
          chars={'workplaces': 40, 'meeting_rooms': 1},
          amenities=['wifi', 'coffee_tea', 'kitchen', 'air_conditioning'],
          uz="Samarqand markazidagi kovorking: soatlik va kunlik erkin joy, qahva va tez internet.",
          ru='Коворкинг в центре Самарканда: свободное место по часам и дням, кофе и быстрый интернет.',
          en='Coworking in central Samarkand: hot desks by the hour or day, coffee and fast internet.'),
    # Muzokara va tadbirlar
    place('sharq_events', 'trening-zali', 'Mirobod trening zali, 40 kishilik',
          "Toshkent, Mirobod tumani, Taras Shevchenko ko'chasi 21", ('41.2990', '69.2710'),
          prices={'price_hourly': 250000, 'price_daily': 1600000}, images=MEETING, area=75, people=40,
          chars={'capacity': 40, 'layout': 'sinf'},
          amenities=['projector', 'wifi', 'coffee_tea', 'air_conditioning', 'microphone'],
          uz="40 kishilik trening zali: proyektor, doska, mikrofon va kofe-breyk.",
          ru='Зал для тренингов на 40 человек: проектор, доска, микрофон и кофе-брейк.',
          en='Training room for 40 with a projector, whiteboard, microphone and coffee break.'),
    place('sharq_events', 'tadbir-maydoni', 'Loft tadbir maydoni, 150 mehmon',
          "Toshkent, Yakkasaroy tumani, Bobur ko'chasi 9", ('41.2903', '69.2550'),
          prices={'price_hourly': 900000, 'price_daily': 6500000}, images=HALL, area=320, people=150, promoted=True,
          chars={'capacity': 150, 'layout': 'fursh'},
          amenities=['sound_system', 'microphone', 'stage', 'catering', 'projector', 'wifi', 'parking', 'air_conditioning'],
          uz="Prezentatsiya, korporativ va ko'rgazmalar uchun 320 m² loft: sahna, ovoz tizimi va keytering.",
          ru='Лофт 320 м² для презентаций, корпоративов и выставок: сцена, звук и кейтеринг.',
          en='A 320 m² loft for launches, corporate parties and exhibitions with a stage, sound and catering.'),
    place('oqtepa_meet', 'studiya', 'Podkast va foto studiya, Oqtepa',
          "Toshkent, Chilonzor tumani, Oqtepa ko'chasi 3", ('41.2970', '69.2250'),
          prices={'price_hourly': 180000, 'price_daily': 1100000}, images=STUDIO, area=40, people=6, booking='instant',
          chars={'capacity': 6},
          amenities=['microphone', 'sound_system', 'video_conf', 'wifi', 'air_conditioning'],
          uz="Podkast, intervyu va kontent suratga olish uchun jihozlangan studiya: mikrofonlar, yorug'lik va fon.",
          ru='Студия для подкастов, интервью и контента: микрофоны, свет и фоны.',
          en='A studio for podcasts, interviews and content with microphones, lights and backdrops.'),
    # Savdo maydonlari
    place('bunyod_cowork', 'dokon', 'Chilonzorda savdo maydoni sotiladi',
          "Toshkent, Chilonzor tumani, Bunyodkor shoh ko'chasi 18", ('41.2879', '69.2047'),
          deal='sale', sale_price=2400000000, images=SHOP, area=210, people=40,
          chars={'floor': 1, 'ceiling_height': 4, 'building_type': 'turar-joy', 'renovation': 'tamirlangan'},
          amenities=['parking', 'shop_window', 'separate_entrance', 'high_traffic', 'water_sewage'],
          uz="Bosh ko'chada 1-qavatdagi 210 m² savdo maydoni: alohida kirish, katta vitrinalar va avtoturargoh.",
          ru='Торговая площадь 210 м² на первом этаже у главной улицы: отдельный вход, витрины и парковка.',
          en='210 m² ground-floor retail on the main street with a separate entrance, shop windows and parking.'),
    place('kamalak_business', 'dokon', "Yunusobodda ko'cha bo'yidagi do'kon ijaraga",
          "Toshkent, Yunusobod tumani, Amir Temur shoh ko'chasi 88", ('41.3450', '69.2840'),
          prices={'price_monthly': 14000000}, images=SHOP, area=65, people=10,
          chars={'floor': 1, 'ceiling_height': 3, 'building_type': 'turar-joy', 'renovation': 'tamirlangan'},
          amenities=['shop_window', 'separate_entrance', 'high_traffic', 'air_conditioning', 'water_sewage'],
          uz="Bekat yonidagi 65 m² do'kon: katta vitrina, alohida kirish va doimiy odam oqimi.",
          ru='Магазин 65 м² у остановки: большая витрина, отдельный вход и постоянный трафик.',
          en='A 65 m² shop by a bus stop with a big window, its own entrance and steady foot traffic.'),
    place('yunusobod_hub', 'savdo-markazi-joyi', 'Savdo markazida 40 m² butik',
          "Toshkent, Shayxontohur tumani, Labzak ko'chasi 1, savdo markazi 2-qavat", ('41.3240', '69.2480'),
          prices={'price_monthly': 11000000}, images=SHOP, area=40, people=6,
          chars={'floor': 2, 'ceiling_height': 3, 'building_type': 'savdo-markazi', 'renovation': 'oq-suvoq'},
          amenities=['shop_window', 'high_traffic', 'air_conditioning', 'security', 'parking'],
          uz="Mashhur savdo markazining 2-qavatida 40 m² joy: kiyim yoki aksessuar do'koni uchun mos.",
          ru='Помещение 40 м² на 2 этаже популярного ТЦ, подойдёт под одежду или аксессуары.',
          en='A 40 m² unit on the 2nd floor of a popular mall, suited to fashion or accessories.'),
    place('samarqand_space', 'orolcha', 'Savdo markazida orolcha, 8 m²',
          "Samarqand, Rudakiy ko'chasi 45, savdo markazi", ('39.6520', '66.9700'),
          prices={'price_monthly': 3500000}, images=SHOP, area=8, people=2,
          chars={'floor': 1, 'building_type': 'savdo-markazi'},
          amenities=['high_traffic', 'security', 'air_conditioning'],
          uz="Kirish yonidagi orolcha: kofe, telefon aksessuarlari yoki shirinliklar savdosi uchun.",
          ru='Островок у входа: под кофе, аксессуары для телефонов или сладости.',
          en='A kiosk island by the entrance for coffee, phone accessories or sweets.'),
    place('navoiy_office', 'shourum', 'Sergelida mebel shourumi sotiladi',
          "Toshkent, Sergeli tumani, Yangi Sergeli ko'chasi 25", ('41.2290', '69.2170'),
          deal='sale', sale_price=3600000000, images=SHOP, area=380, people=30,
          chars={'floor': 1, 'ceiling_height': 6, 'building_type': 'alohida-bino', 'renovation': 'tamirlangan'},
          amenities=['shop_window', 'separate_entrance', 'parking', 'security', 'water_sewage'],
          uz="380 m² shourum: 6 metrli shift, panoramali vitrinalar va katta avtoturargoh.",
          ru='Шоурум 380 м²: потолки 6 м, панорамные витрины и большая парковка.',
          en='A 380 m² showroom with 6 m ceilings, panoramic windows and a large car park.'),
    # Tijorat maydonlari
    place('sharq_events', 'kafe-restoran', 'Kafe uchun tayyor joy, Yakkasaroy',
          "Toshkent, Yakkasaroy tumani, Shota Rustaveli ko'chasi 40", ('41.2880', '69.2630'),
          prices={'price_monthly': 22000000}, images=CAFE, area=150, people=60, promoted=True,
          chars={'floor': 1, 'rooms': 3, 'restrooms': 2, 'ceiling_height': 4, 'power_kw': 50,
                 'renovation': 'tamirlangan', 'building_type': 'turar-joy'},
          amenities=['ventilation', 'gas', 'water_sewage', 'separate_entrance', 'shop_window', 'parking'],
          uz="Oshxona va vytyajka tayyor bo'lgan 150 m² joy: gaz, 50 kVt elektr va yozgi terrasa.",
          ru='Помещение 150 м² под кафе: готовая кухня с вытяжкой, газ, 50 кВт и летняя терраса.',
          en='A 150 m² cafe-ready space with a kitchen and hood, gas, 50 kW power and a summer terrace.'),
    place('kamalak_business', 'kafe-restoran', 'Restoran binosi sotiladi, Buxoro',
          "Buxoro, Bahouddin Naqshband ko'chasi 12", ('39.7681', '64.4556'),
          deal='sale', sale_price=4200000000, images=CAFE, area=520, people=200,
          chars={'floor': 2, 'rooms': 6, 'restrooms': 4, 'ceiling_height': 4, 'power_kw': 120,
                 'renovation': 'tamirlangan', 'building_type': 'alohida-bino'},
          amenities=['ventilation', 'gas', 'water_sewage', 'separate_entrance', 'parking'],
          uz="Turistik markaz yaqinidagi 2 qavatli restoran binosi: 200 o'rin, to'liq jihozlangan oshxona.",
          ru='Двухэтажное здание ресторана рядом с туристическим центром: 200 мест, оборудованная кухня.',
          en='Two-storey restaurant building near the tourist centre: 200 seats and a fitted kitchen.'),
    place('oqtepa_meet', 'gozallik-saloni', "Go'zallik saloni uchun joy, Olmazor",
          "Toshkent, Olmazor tumani, Qorasaroy ko'chasi 210", ('41.3370', '69.2130'),
          prices={'price_monthly': 9000000}, images=SALON, area=70, people=8,
          chars={'floor': 1, 'rooms': 3, 'restrooms': 1, 'renovation': 'tamirlangan', 'building_type': 'turar-joy'},
          amenities=['water_sewage', 'separate_entrance', 'shop_window', 'air_conditioning'],
          uz="70 m² joy: 3 ta xona, har birida suv, alohida kirish va ko'chaga qaragan vitrina.",
          ru='Помещение 70 м²: 3 кабинета с водой, отдельный вход и витрина на улицу.',
          en='A 70 m² space with 3 rooms with water, its own entrance and a street window.'),
    place('navoiy_office', 'klinika', 'Klinika uchun 2 qavatli joy, Namangan',
          "Namangan, Navoiy ko'chasi 33", ('40.9983', '71.6726'),
          prices={'price_monthly': 18000000}, images=CLINIC, area=260, people=30,
          chars={'floor': 1, 'rooms': 11, 'restrooms': 4, 'power_kw': 40, 'renovation': 'oq-suvoq',
                 'building_type': 'alohida-bino'},
          amenities=['water_sewage', 'separate_entrance', 'parking', 'ventilation'],
          uz="Tibbiyot markazi uchun 260 m²: 11 ta kabinet, har birida suv, alohida kirish va avtoturargoh.",
          ru='260 м² под медцентр: 11 кабинетов с водой, отдельный вход и парковка.',
          en='260 m² for a medical centre: 11 rooms with water, a separate entrance and parking.'),
    place('yunusobod_hub', 'oquv-markazi', "O'quv markazi uchun joy, Andijon",
          "Andijon, Bobur shoh ko'chasi 58", ('40.7821', '72.3442'),
          prices={'price_monthly': 8500000}, images=OFFICE_2, area=160, people=60,
          chars={'floor': 2, 'rooms': 6, 'restrooms': 2, 'renovation': 'tamirlangan', 'building_type': 'biznes-markaz'},
          amenities=['wifi', 'air_conditioning', 'separate_entrance', 'parking'],
          uz="6 ta auditoriyali 160 m² joy: til kurslari va repetitorlik markazlari uchun.",
          ru='160 м² с 6 аудиториями — под языковые курсы и учебный центр.',
          en='160 m² with 6 classrooms for language courses or a tutoring centre.'),
    place('bunyod_cowork', 'erkin-maqsad', "Erkin maqsadli noturar joy sotiladi, Farg'ona",
          "Farg'ona, Al-Farg'oniy ko'chasi 19", ('40.3864', '71.7864'),
          deal='sale', sale_price=780000000, images=BUILDING, area=95, people=15,
          chars={'floor': 1, 'rooms': 3, 'restrooms': 1, 'renovation': 'qora-suvoq', 'building_type': 'turar-joy'},
          amenities=['separate_entrance', 'water_sewage', 'shop_window'],
          uz="Qora suvoqdagi 95 m² noturar joy: ofis, do'kon yoki xizmat ko'rsatish uchun.",
          ru='Нежилое помещение 95 м² в черновой отделке: под офис, магазин или услуги.',
          en='A 95 m² shell-finish commercial unit for an office, shop or services.'),
    # Ombor va ishlab chiqarish
    place('kamalak_business', 'ombor', 'Sergelida isitiladigan ombor, 1200 m²',
          "Toshkent, Sergeli tumani, Sanoat zonasi 7", ('41.2140', '69.2300'),
          prices={'price_monthly': 54000000}, images=WAREHOUSE, area=1200, people=20, promoted=True,
          chars={'ceiling_height': 9, 'power_kw': 150, 'temperature': 'isitiladi', 'building_type': 'sanoat-zonasi'},
          amenities=['ramp', 'truck_access', 'security', 'cctv', 'access_24_7', 'parking'],
          uz="1200 m² A-klass ombor: 9 m shift, rampa, fura kirishi, 24/7 qo'riqlash va videokuzatuv.",
          ru='Склад класса A 1200 м²: потолки 9 м, рампа, подъезд для фур, охрана 24/7 и видеонаблюдение.',
          en='A 1,200 m² class-A warehouse: 9 m ceilings, a ramp, truck access, 24/7 security and CCTV.'),
    place('navoiy_office', 'sovutgichli-ombor', 'Sovutgichli ombor, Toshkent viloyati',
          "Toshkent viloyati, Zangiota tumani, Katta halqa yo'li", ('41.2400', '69.1600'),
          prices={'price_monthly': 38000000}, images=WAREHOUSE, area=600, people=10,
          chars={'ceiling_height': 7, 'power_kw': 250, 'temperature': 'sovutgichli', 'building_type': 'sanoat-zonasi'},
          amenities=['ramp', 'truck_access', 'security', 'cctv', 'access_24_7'],
          uz="Meva-sabzavot va oziq-ovqat uchun 600 m² sovutgichli ombor: -18 °C gacha kameralar.",
          ru='Холодильный склад 600 м² для фруктов и продуктов: камеры до -18 °C.',
          en='A 600 m² cold store for produce and food with chambers down to -18 °C.'),
    place('bunyod_cowork', 'mini-boks', 'Mini-boks saqlash xonalari, Chilonzor',
          "Toshkent, Chilonzor tumani, Qatortol ko'chasi 60", ('41.2800', '69.2100'),
          prices={'price_daily': 25000, 'price_monthly': 450000}, images=WAREHOUSE, area=6, people=1, booking='instant',
          chars={'ceiling_height': 3, 'temperature': 'isitiladi'},
          amenities=['security', 'cctv', 'access_24_7'],
          uz="6 m² shaxsiy boks: mavsumiy narsalar, tovar zaxirasi yoki arxiv uchun. 24/7 kirish.",
          ru='Личный бокс 6 м² для сезонных вещей, запаса товара или архива. Доступ 24/7.',
          en='A 6 m² private box for seasonal items, stock or archives with 24/7 access.'),
    place('samarqand_space', 'ishlab-chiqarish-sexi', 'Ishlab chiqarish sexi sotiladi, Samarqand',
          "Samarqand viloyati, Pastdarg'om tumani, sanoat zonasi", ('39.6200', '66.8800'),
          deal='sale', sale_price=5600000000, images=WAREHOUSE, area=1800, people=60,
          chars={'ceiling_height': 10, 'power_kw': 400, 'temperature': 'isitiladi', 'building_type': 'sanoat-zonasi'},
          amenities=['crane', 'truck_access', 'gas', 'water_sewage', 'security', 'parking'],
          uz="1800 m² sex: 10 m shift, 5 tonnalik kran-balka, 400 kVt elektr, gaz va fura kirishi.",
          ru='Цех 1800 м²: потолки 10 м, кран-балка 5 т, 400 кВт, газ и подъезд для фур.',
          en='An 1,800 m² workshop: 10 m ceilings, a 5 t overhead crane, 400 kW, gas and truck access.'),
    place('kamalak_business', 'logistika-markazi', 'Logistika markazi, Chirchiq yo\'li',
          "Toshkent viloyati, Qibray tumani, Chirchiq yo'li 14-km", ('41.3900', '69.4400'),
          prices={'price_monthly': 120000000}, images=WAREHOUSE, area=3500, people=40,
          chars={'ceiling_height': 12, 'power_kw': 300, 'temperature': 'isitiladi', 'building_type': 'sanoat-zonasi'},
          amenities=['ramp', 'truck_access', 'security', 'cctv', 'access_24_7', 'parking'],
          uz="3500 m² logistika kompleksi: 8 ta rampa, 12 m shift va fura uchun manevr maydoni.",
          ru='Логистический комплекс 3500 м²: 8 рамп, потолки 12 м и площадка для разворота фур.',
          en='A 3,500 m² logistics complex with 8 ramps, 12 m ceilings and a truck yard.'),
]

def rotated(items, shift):
    shift %= len(items)
    return items[shift:] + items[:shift]


RENT_PRICE_FIELDS = ('price_hourly', 'price_daily', 'price_weekly', 'price_monthly')


class Command(BaseCommand):
    help = 'Create or update demo listings in every marketplace category.'

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        moderator = User.objects.filter(is_superuser=True).order_by('pk').first()
        owners = {}
        for username, (company, phone) in OWNERS.items():
            owner = User.objects.filter(username=username).first()
            if owner is None:
                owner = User(username=username, first_name=company, role='partner', phone_number=phone)
                owner.set_unusable_password()
                owner.save()
            owners[username] = owner

        now = timezone.now()
        counts = {Category.DEAL_RENT: 0, Category.DEAL_SALE: 0}
        for index, data in enumerate(PLACES):
            subcategory = SubCategory.objects.select_related('category').get(slug=data['sub'])
            is_sale = data['deal'] == Category.DEAL_SALE
            fields = dict(
                owner=owners[data['owner']], subcategory=subcategory, category=subcategory.category.name_ru,
                location=data['location'], latitude=Decimal(data['coords'][0]), longitude=Decimal(data['coords'][1]),
                deal_type=data['deal'], sale_price=data['sale_price'] if is_sale else None,
                currency='UZS', booking_type='request' if is_sale else data['booking'],
                area=data['area'], people=data['people'], promoted=data['promoted'],
                # Listings sharing a photo set each open on a different photo.
                images=[IMAGE.format(image) for image in rotated(data['images'], index)],
                characteristics=data['chars'], amenities=data['amenities'],
                description_uz=data['uz'], description_ru=data['ru'], description_en=data['en'],
                status='approved', moderated_by=moderator, moderated_at=now,
                **{name: (None if is_sale else data['prices'].get(name)) for name in RENT_PRICE_FIELDS},
            )
            listing, _ = Place.objects.update_or_create(title=data['title'], defaults=fields)
            if is_sale:
                listing.discounts.clear()
            counts[data['deal']] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Marketplace listings: {counts['rent']} for rent, {counts['sale']} for sale."
        ))
