# forms.py
from django import forms
from .models import Debt

class DebtForm(forms.ModelForm):
    class Meta:
        model = Debt
        fields = ['debtor_name', 'phone', 'address', 'amount', 'due_date', 'description']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'}),
            'description': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Делаем поля необязательными, кроме обязательных
        self.fields['phone'].required = False
        self.fields['address'].required = False
        self.fields['description'].required = False