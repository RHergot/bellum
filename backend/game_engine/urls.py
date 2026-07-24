from django.urls import path
from .views import NewGameAPIView, GameStateAPIView, MakeMoveAPIView

urlpatterns = [
    path('game/new/', NewGameAPIView.as_view(), name='game-new'),
    path('game/<str:game_id>/state/', GameStateAPIView.as_view(), name='game-state'),
    path('game/<str:game_id>/move/', MakeMoveAPIView.as_view(), name='game-move'),
]
