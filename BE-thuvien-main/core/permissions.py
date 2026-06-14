from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_librarian(user):
    if not user or not user.is_authenticated:
        return False
    role = str(getattr(user, 'role', '') or '').strip().lower()
    return bool(
        user.is_superuser or
        user.is_staff or
        role in ('librarian', 'admin', 'staff')
    )


class IsLibrarianOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return _is_librarian(request.user)


class IsLibrarian(BasePermission):
    def has_permission(self, request, view):
        return _is_librarian(request.user)