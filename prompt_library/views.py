from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .permissions import IsAuthorOrReadOnly
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import PromptTemplate, Category, Tag, UserPromptLibrary
from .serializers import PromptTemplateSerializer, CategorySerializer, TagSerializer, UserPromptLibrarySerializer
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAdminUser
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.cache import cache
import requests
import time
import logging


class PromptTemplateViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    # Read access for everyone; create requires authentication; update/delete only by author
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category__slug', 'tags__name', 'is_public']
    search_fields = ['title', 'prompt_text', 'description', 'tags__name']
    ordering_fields = ['created_at', 'likes_count']

    def get_queryset(self):
        qs = super().get_queryset()
        # Only public prompts for anonymous users
        if not self.request.user.is_authenticated:
            return qs.filter(is_public=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        prompt = self.get_object()
        # Simple toggle: record in UserPromptLibrary as favorite and increment likes_count
        upl, created = UserPromptLibrary.objects.get_or_create(user=request.user, prompt=prompt)
        upl.is_favorite = True
        upl.save()
        prompt.likes_count = prompt.saved_by.filter(is_favorite=True).count()
        prompt.save(update_fields=['likes_count'])
        return Response({'status': 'liked', 'likes_count': prompt.likes_count})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unlike(self, request, pk=None):
        prompt = self.get_object()
        try:
            upl = UserPromptLibrary.objects.get(user=request.user, prompt=prompt)
            upl.is_favorite = False
            upl.save()
        except UserPromptLibrary.DoesNotExist:
            pass
        prompt.likes_count = prompt.saved_by.filter(is_favorite=True).count()
        prompt.save(update_fields=['likes_count'])
        return Response({'status': 'unliked', 'likes_count': prompt.likes_count})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_templates(self, request):
        """Return prompts authored by the current user."""
        qs = self.get_queryset().filter(author=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='from-generated')
    def create_from_generated(self, request):
        """Create a PromptTemplate from generated text (used by the AI generator frontend).

        Expects JSON: { prompt_text: str, title?: str, description?: str, tag_names?: [str], is_public?: bool }
        Returns serialized PromptTemplate (201).
        """
        data = request.data or {}
        prompt_text = data.get('prompt_text')
        if not prompt_text or not str(prompt_text).strip():
            return Response({'error': 'prompt_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            'title': data.get('title') or (str(prompt_text).strip().split('\n')[0][:80]),
            'prompt_text': prompt_text,
            'description': data.get('description', ''),
            'is_public': bool(data.get('is_public', False)),
            'tag_names': data.get('tag_names', []),
        }

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        # save with author
        prompt = serializer.save(author=request.user)
        out = self.get_serializer(prompt)
        return Response(out.data, status=status.HTTP_201_CREATED)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class UserPromptLibraryViewSet(viewsets.ModelViewSet):
    serializer_class = UserPromptLibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserPromptLibrary.objects.filter(user=self.request.user).select_related('prompt')

    def perform_create(self, serializer):
        # kept for compatibility - not used when create() is overridden below
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create or return existing UserPromptLibrary entry for (user, prompt).

        This prevents IntegrityError / 500 when the client posts the same prompt twice.
        Returns 201 when a new record was created, 200 when it already existed.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prompt = serializer.validated_data.get('prompt')

        obj, created = UserPromptLibrary.objects.get_or_create(
            user=request.user,
            prompt=prompt,
            defaults={
                'is_favorite': serializer.validated_data.get('is_favorite', False)
            }
        )

        out_serializer = self.get_serializer(obj)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def favorites(self, request):
        """Return user's favorite (liked) prompts."""
        qs = UserPromptLibrary.objects.filter(user=request.user, is_favorite=True).select_related('prompt')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class GeneratePromptView(APIView):
    # Allow unauthenticated access and disable session auth for this endpoint so
    # browser POSTs from the frontend don't require CSRF tokens.
    permission_classes = [AllowAny]
    authentication_classes = []
    logger = logging.getLogger(__name__)
    """Proxy endpoint to generate prompts via Google Gemini Pro.

    Expects POST JSON body: { userInput, style, mood, artMovement, quality, detailLevel, advancedOptions }
    Returns: { variations: [str, str, str], metadata: {...} }
    """

    def post(self, request):
        data = request.data or {}
        user_input = data.get('userInput', '')
        style = data.get('style')
        mood = data.get('mood')
        art_movement = data.get('artMovement')
        quality = data.get('quality')
        detail = data.get('detailLevel')
        advanced = data.get('advancedOptions', {}) or {}

        if not user_input or not user_input.strip():
            return Response({'error': 'userInput required'}, status=status.HTTP_400_BAD_REQUEST)

        # Simple rate limiting: 60 requests per minute per user or IP
        identifier = f"gemini_rl_{request.user.id if request.user.is_authenticated else request.META.get('REMOTE_ADDR')}"
        count = cache.get(identifier, 0)
        if count >= 60:
            return Response({'error': 'Rate limit exceeded'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        cache.set(identifier, count + 1, timeout=60)

        api_key = getattr(settings, 'GEMINI_API_KEY', None) or getattr(settings, 'NEXT_PUBLIC_GEMINI_API_KEY', None)
        if not api_key:
            return Response({'error': 'Gemini API key not configured on server'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        # Build a stronger system/user prompt for Gemini with clear guidelines and examples
        system = (
            "You are an expert AI art prompt engineer and copywriter for visual artists. Your job is to produce "
            "detailed, richly descriptive image-generation prompts suitable for modern multimodal models and image pipelines. "
            "Each response must contain exactly one prompt per variation (no extra commentary), be vivid, actionable, and "
            "include technical keywords, aspect/ratio suggestions, camera/lens info when relevant, lighting, mood, "
            "composition notes, and any negative constraints. Produce 3 distinct variations that differ in style, "
            "composition, or mood. Aim for extended, richly-detailed prompts: prefer 80–220 words per variation (long-form), "
            "but keep them focused and useful for image generation. Use technical qualifiers like the user's requested quality (for example '4K' or '8K'), 'ultra-detailed', 'cinematic lighting', "
            "'ArtStation', and describe materials, textures, and color palettes when helpful."
        )

        # Compose user message with explicit slots the model can use
        user_msg = (
            f"Description: {user_input}\n"
            f"Requested style: {style or 'any'}\n"
            f"Mood / tone: {mood or 'neutral'}\n"
            f"Art movement / influence: {art_movement or 'none'}\n"
            f"Quality target: {quality or 'high detail'}\n"
            f"Detail level (1-5): {detail or ''}\n"
            f"Advanced options: {advanced if advanced else 'none'}\n"
            "Instructions: Create 3 variations. For each, include: a 1-2 word short title, the prompt text (single paragraph), "
            "and a trailing bracketed hint for aspect ratio like [16:9] or [1:1] if relevant. Return only the three prompt texts."
        )

        # Call configured generative API endpoint (use Generative Language API format)
        # Default to Google's generative language v1beta endpoint unless overridden
        base = getattr(settings, 'GENERATIVE_API_BASE', 'https://generativelanguage.googleapis.com/v1beta')
        model = getattr(settings, 'GEMINI_MODEL', 'gemini-pro')
        auth_method = getattr(settings, 'GEMINI_API_AUTH_METHOD', 'key')

        url = f"{base.rstrip('/')}/models/{model}:generateContent"

        headers = {'Content-Type': 'application/json'}

        # We'll attempt up to 3 generation calls with slightly different temperatures
        temps = [0.7, 0.9, 1.1]
        max_tokens = 1200
        variations = []
        gemini_body = None

        for temp in temps:
            payload = {
                "contents": [{
                    "parts": [{"text": f"{system}\n\n{user_msg}"}]
                }],
                "generationConfig": {
                    "maxOutputTokens": max_tokens,
                    "temperature": float(temp),
                    "topP": 0.95
                }
            }

            try:
                if auth_method == 'key':
                    resp = requests.post(f"{url}?key={api_key}", json=payload, headers=headers, timeout=20)
                else:
                    headers['Authorization'] = f'Bearer {api_key}'
                    resp = requests.post(url, json=payload, headers=headers, timeout=20)
            except requests.RequestException as e:
                self.logger.error("Gemini request exception: %s", str(e))
                gemini_body = str(e)
                resp = None

            if resp is None:
                continue

            gemini_body = ''
            if resp.status_code != 200:
                try:
                    gemini_body = resp.text
                except Exception:
                    gemini_body = ''
                self.logger.warning("Gemini non-200 (%s): %s", resp.status_code, gemini_body[:300])
                # try next temperature
                continue

            try:
                j = resp.json()
            except ValueError:
                j = None

            # Parse the generative language response for candidate text parts
            found = []
            if isinstance(j, dict):
                # candidates -> content -> parts -> text
                for cand in j.get('candidates', []):
                    content = cand.get('content') or cand.get('message') or {}
                    parts = []
                    if isinstance(content, dict):
                        parts = content.get('parts') or []
                    if parts:
                        for p in parts:
                            if isinstance(p, dict) and 'text' in p and p.get('text'):
                                found.append(p.get('text').strip())
                    else:
                        # some responses may include 'text' directly
                        txt = cand.get('text') or cand.get('output')
                        if isinstance(txt, str) and txt.strip():
                            found.append(txt.strip())

                # fallback: also inspect top-level 'output' or nested text fields
                if not found:
                    if 'output' in j:
                        out = j.get('output')
                        if isinstance(out, list):
                            for o in out:
                                if isinstance(o, dict):
                                    for part in o.get('content', {}).get('parts', []) if o.get('content') else []:
                                        if isinstance(part, dict) and 'text' in part:
                                            found.append(part.get('text').strip())
                                elif isinstance(o, str):
                                    found.append(o.strip())
                        elif isinstance(out, str):
                            found.append(out.strip())

            # append unique, non-empty texts to variations
            for t in found:
                if not t:
                    continue
                if t not in variations:
                    variations.append(t)
                if len(variations) >= 3:
                    break

            if len(variations) >= 3:
                break

        # If we couldn't extract variations from Gemini (j is None or empty),
        # provide a deterministic local fallback so the UI still works.
        if not any(v.strip() for v in variations):
            # Fallbacks (concise, practical prompts) when Gemini is unavailable
            base = str(user_input).strip()
            adv_parts = [f"{k}:{v}" for k, v in (advanced.items() if isinstance(advanced, dict) else []) if v]
            adv = ', '.join(adv_parts)
            v1 = f"{base} — cinematic, highly detailed, {quality}. Use dramatic rim lighting, shallow depth of field (50–85mm), emphasis on texture and composition. {adv}".strip()
            v2 = f"{base} in the style of {art_movement or style}: layered environment, strong foreground interest, volumetric light shafts, and balanced color harmony. Render {quality}, ultra-detailed.".strip()
            v3 = f"Portrait/character study of {base}: tactile materials, expressive pose, soft bokeh, studio-quality lighting. Negative constraints: no watermarks, no extra limbs. Render {quality}.".strip()
            variations = [v1, v2, v3]

            metadata = {
                'model': 'local-fallback',
                'timestamp': int(time.time()),
                'note': 'Returned local fallback prompts because Gemini API was unavailable or returned an error',
                'gemini_details': gemini_body,
            }
            return Response({'variations': variations, 'metadata': metadata})

        # Ensure we return three items (may be shorter)
        while len(variations) < 3:
            variations.append('')
        # Attempt to parse structured variations (title, prompt, aspect) when model follows the recommended format
        def parse_variation(text: str):
            t = (text or '').strip()
            title = None
            aspect = None

            # extract trailing aspect hint like [16:9] or (16:9)
            import re
            m = re.search(r"\[?(\d+:\d+)\]?$", t)
            if m:
                aspect = m.group(1)
                # remove the trailing aspect token
                t = re.sub(r"\s*\[?%s\]?\s*$" % re.escape(aspect), '', t).strip()

            # if content has multiple lines, and first line is short, treat that as title
            lines = [ln.strip() for ln in t.splitlines() if ln.strip()]
            if len(lines) >= 2 and len(lines[0]) <= 40:
                title = lines[0]
                prompt_text = ' '.join(lines[1:]).strip()
            else:
                # If the model included a separator like ' - ' after a short title, split it
                if ' - ' in t and len(t.split(' - ', 1)[0]) <= 30:
                    parts = t.split(' - ', 1)
                    title = parts[0].strip()
                    prompt_text = parts[1].strip()
                else:
                    # fallback: no explicit title, use whole text as prompt
                    prompt_text = t
                    # derive a short title from the first 3-6 words
                    words = [w for w in re.split(r"\s+", prompt_text) if w]
                    if len(words) > 3:
                        title = ' '.join(words[:4])
                    elif words:
                        title = ' '.join(words[:min(3, len(words))])

            return {'title': title, 'prompt': prompt_text, 'aspect': aspect}

        structured = [parse_variation(v) for v in variations]
        metadata = {'model': model, 'timestamp': int(time.time())}
        return Response({'variations': variations, 'structured_variations': structured, 'metadata': metadata})


class GeneratePromptDiagnoseView(APIView):
    """Lightweight diagnostics for the configured generative API.

    Admin-only. Attempts a small request to the configured GENERATIVE_API_BASE/model
    and returns sanitized status information. Does NOT expose API keys.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        base = getattr(settings, 'GENERATIVE_API_BASE', 'https://generativelanguage.googleapis.com/v1beta')
        model = getattr(settings, 'GEMINI_MODEL', 'gemini-pro')
        auth_method = getattr(settings, 'GEMINI_API_AUTH_METHOD', 'key')
        api_key = getattr(settings, 'GEMINI_API_KEY', None) or getattr(settings, 'NEXT_PUBLIC_GEMINI_API_KEY', None)

        url = f"{base.rstrip('/')}/models/{model}:generateContent"
        headers = {'Content-Type': 'application/json'}
        if auth_method == 'bearer':
            if api_key:
                headers['Authorization'] = f'Bearer {api_key}'
        else:
            # will be appended as ?key= during the request below
            pass

        payload = {
            'contents': [{
                'parts': [{ 'text': 'Diagnostics ping - reply with OK' }]
            }],
            'generationConfig': { 'maxOutputTokens': 16 }
        }

        try:
            if auth_method == 'key' and api_key:
                resp = requests.post(f"{url}?key={api_key}", json=payload, headers=headers, timeout=8)
            else:
                resp = requests.post(url, json=payload, headers=headers, timeout=8)

            status_code = getattr(resp, 'status_code', None)
            elapsed_ms = int(getattr(resp, 'elapsed', 0).total_seconds() * 1000) if getattr(resp, 'elapsed', None) else None
            raw_text = ''
            try:
                raw_text = resp.text or ''
            except Exception:
                raw_text = ''

            # Sanitize any occurrence of the API key in returned text
            if api_key and api_key in raw_text:
                raw_text = raw_text.replace(api_key, '[REDACTED]')

            snippet = (raw_text or '')[:400]
            ok = status_code == 200
            return Response({'ok': ok, 'status_code': status_code, 'elapsed_ms': elapsed_ms, 'snippet': snippet, 'model': model})
        except requests.RequestException as e:
            msg = str(e)
            if api_key and api_key in msg:
                msg = msg.replace(api_key, '[REDACTED]')
            return Response({'ok': False, 'error': 'request_exception', 'details': msg})
