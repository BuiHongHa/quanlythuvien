from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from books.models import Book
from core.models import User
from .models import Loan


class LoanWorkflowTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.reader = User.objects.create_user(
            username='reader1',
            password='password123',
            full_name='Độc giả 1',
            role='reader'
        )
        self.librarian = User.objects.create_user(
            username='lib1',
            password='password123',
            full_name='Thủ thư 1',
            role='librarian',
            is_staff=True
        )
        self.book = Book.objects.create(
            title='Sách Lập Trình',
            total_quantity=5,
            available_quantity=5
        )

    def test_partial_return_updates_outstanding_quantity_and_stock(self):
        self.client.force_authenticate(user=self.reader)
        response = self.client.post(
            '/api/loans/loans/',
            {
                'items': [{'book': self.book.id, 'quantity': 3}],
                'borrow_duration': 14,
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        loan_id = response.data['loan_id']

        response = self.client.patch(
            f'/api/loans/loans/{loan_id}/return_book/',
            {'items': [{'book': self.book.id, 'quantity': 1}]},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Trả sách thành công', response.data['message'])
        self.assertEqual(response.data['loan_status'], 'borrowed')

        loan = Loan.objects.get(id=loan_id)
        detail = loan.loan_details.get(book=self.book)
        self.book.refresh_from_db()

        self.assertEqual(detail.returned_quantity, 1)
        self.assertEqual(detail.outstanding_quantity, 2)
        self.assertEqual(self.book.available_quantity, 2)
        self.assertIsNone(loan.return_date)

    def test_return_all_closes_loan_and_restores_book_quantity(self):
        self.client.force_authenticate(user=self.reader)
        response = self.client.post(
            '/api/loans/loans/',
            {
                'items': [{'book': self.book.id, 'quantity': 2}],
                'borrow_duration': 14,
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        loan_id = response.data['loan_id']

        response = self.client.patch(
            f'/api/loans/loans/{loan_id}/return_book/',
            {'items': [{'book': self.book.id, 'quantity': 2}]},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['loan_status'], 'returned')

        loan = Loan.objects.get(id=loan_id)
        detail = loan.loan_details.get(book=self.book)
        self.book.refresh_from_db()

        self.assertEqual(detail.returned_quantity, 2)
        self.assertEqual(detail.outstanding_quantity, 0)
        self.assertEqual(self.book.available_quantity, 5)
        self.assertEqual(loan.status, 'returned')
        self.assertEqual(loan.return_date, date.today())
