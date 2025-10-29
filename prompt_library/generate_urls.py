from django.urls import path
from .views import GeneratePromptView, GeneratePromptDiagnoseView

urlpatterns = [
    path('', GeneratePromptView.as_view(), name='generate_prompt'),
    path('diagnose/', GeneratePromptDiagnoseView.as_view(), name='generate_diagnose'),
]
