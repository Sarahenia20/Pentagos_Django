from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAuthorOrReadOnly(BasePermission):
    """Allow read-only access for everyone, but restrict unsafe methods to the prompt's author."""

    def has_object_permission(self, request, view, obj):
        # Allow safe methods for any request
        if request.method in SAFE_METHODS:
            return True
        # Otherwise ensure the object has an author and matches the request user
        try:
            return obj.author is not None and obj.author == request.user
        except Exception:
            return False
