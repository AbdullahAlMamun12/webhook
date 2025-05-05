from django.urls import path
from . import views

urlpatterns = [
    path('', views.new_session, name='new_session'),
    path('<uuid:session_id>', views.receive_hook, name='receive_hook'),
    path('view/<str:session_id>/', views.view_session, name='view_session'),
    path('edit-response/<str:session_id>', views.edit_response, name='edit_response'),
    path('logs/<uuid:session_id>', views.view_logs, name='view_logs'),
]