"""Moderation helpers using Google Gemini (when available) with a local fallback.

Provides `moderate_text(text)` which returns a dict:
  { 'allowed': bool, 'blocked': bool, 'reasons': [str] }

If GEMINI_API_KEY is configured, attempts to call Google Generative AI classification.
If that fails or key is missing, falls back to a basic regex/keyword filter for profanity, links and spam.
"""

from django.conf import settings
import re
import logging
from pathlib import Path
import unicodedata

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except Exception:
    genai = None

# Try to use better_profanity if available for a comprehensive multilingual list
try:
    from better_profanity import profanity as bp_profanity
except Exception:
    bp_profanity = None

# Basic URL detection
URL_RE = re.compile(r'https?://|www\.|\b\w+\.\w{2,3}\b')


def _load_additional_badwords():
    """Load extra badword lists from media_processing/ai_providers/badwords/*.txt
    Each file should contain one word per line. Filenames may be language codes
    like `en.txt`, `es.txt`, `fr.txt`. Returns a dict mapping language -> set(words).
    """
    base = Path(__file__).resolve().parent
    word_dir = base / 'badwords'
    langs = {}
    if not word_dir.exists():
        return langs

    for p in sorted(word_dir.glob('*.txt')):
        lang = p.stem.lower()
        try:
            text = p.read_text(encoding='utf-8')
            words = set()
            for line in text.splitlines():
                w = line.strip()
                if not w or w.startswith('#'):
                    continue
                words.add(w.lower())
            if words:
                langs[lang] = words
        except Exception:
            logger.exception('Failed to read badwords file: %s', p)
    return langs


def _init_better_profanity():
    """Initialize better_profanity with default list plus any extra language files."""
    if not bp_profanity:
        return False

    try:
        # Prefer loading only English words into better_profanity so it remains
        # focused on English detection. Other languages remain in _EXTRA_BADWORDS_MAP.
        extra_map = _load_additional_badwords()
        en_words = list(extra_map.get('en', []))
        if en_words:
            bp_profanity.load_censor_words(en_words)
        else:
            # No custom English list found; load default built-in list
            bp_profanity.load_censor_words()
        return True
    except Exception:
        logger.exception('Failed to initialize better_profanity')
        return False


_BETTER_PROFANITY_INITIALIZED = _init_better_profanity()

# Load any extra badwords once: mapping language -> set(words)
_EXTRA_BADWORDS_MAP = _load_additional_badwords()

# Also create a flat set for quick generic checks
_EXTRA_BADWORDS_FLAT = set()
for s in _EXTRA_BADWORDS_MAP.values():
    _EXTRA_BADWORDS_FLAT.update(s)


_LEET_MAP = str.maketrans({
    '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's',
    '+': 't', '5': 's', '7': 't'
})


def _normalize_text(text: str) -> str:
    """Lowercase, strip diacritics, and normalize whitespace."""
    if not text:
        return ''
    # Unicode normalize and remove combining characters (accents)
    nkfd = unicodedata.normalize('NFKD', text)
    without_diacritics = ''.join([c for c in nkfd if not unicodedata.combining(c)])
    lowered = without_diacritics.lower()
    # Replace multiple whitespace with single space
    return re.sub(r'\s+', ' ', lowered).strip()


def _deobfuscate(text: str) -> str:
    """Try simple leet substitutions and collapse non-alphanum for detection.

    Returns two variants: a deobfuscated-with-separators version and a collapsed version
    with punctuation removed. These help detect s.p.a.m -> spam and 5p4m -> spam.
    """
    if not text:
        return '', ''
    # Replace obvious leet characters
    t1 = text.translate(_LEET_MAP)
    # Remove repeated characters (aaaargh -> aargh) to reduce obfuscation
    t2 = re.sub(r'(.)\1{2,}', r'\1\1', t1)
    # deob with separators kept
    deob = re.sub(r'[^\w\s]', ' ', t2)
    # collapsed form with only alphanum (good for detecting s.p.a.m -> spam)
    collapsed = re.sub(r'[^\w]', '', t2)
    return deob, collapsed


def _local_check(text: str):
    reasons = []
    normalized = _normalize_text(text)
    deob, collapsed = _deobfuscate(normalized)

    # Check for links (use original text for more reliable URL detection)
    if URL_RE.search(text or ''):
        reasons.append('contains_link')

    # Check profanity using better_profanity first (English-focused). If it flags,
    # return immediately. Otherwise continue to check per-language TXT lists.
    if bp_profanity and _BETTER_PROFANITY_INITIALIZED:
        try:
            if bp_profanity.contains_profanity(text):
                # Use language-tagged reason for English and return early
                reasons.append('profanity:en')
                blocked = True
                return {'allowed': not blocked, 'blocked': blocked, 'reasons': reasons}
        except Exception:
            logger.exception('better_profanity check failed')

    # Check extra lists for word matches (per language)
    # First check coarse membership in flat set for speed
    # Use word-boundary detection against normalized + deobfuscated variants
    for lang, words in _EXTRA_BADWORDS_MAP.items():
        found = False
        # check token/word boundaries in normalized or deob
        for w in words:
            if not w:
                continue
            safe_w = re.escape(w)
            # word boundary check on normalized text
            if re.search(rf"\b{safe_w}\b", normalized):
                reasons.append(f'profanity:{lang}')
                found = True
                break
            # check deobfuscated (separators turned into spaces)
            if re.search(rf"\b{safe_w}\b", deob):
                reasons.append(f'profanity:{lang}')
                found = True
                break
            # collapsed form: detect obfuscated words like s.p.a.m or 5p4m
            if w in collapsed:
                reasons.append(f'profanity:{lang}')
                found = True
                break
        if found:
            break

    # Heuristic: repeated characters or excessive non-alphanumeric may be spam
    try:
        non_alnum_ratio = len(re.sub(r'\w', '', normalized)) / max(1, len(normalized))
        if non_alnum_ratio > 0.4:
            reasons.append('suspicious_content')
    except Exception:
        logger.exception('Failed to compute suspicious_content heuristic')

    blocked = bool(reasons)
    return {'allowed': not blocked, 'blocked': blocked, 'reasons': reasons}


def moderate_text(text: str) -> dict:
    """Moderate the given text.

    Returns: { allowed: bool, blocked: bool, reasons: [str] }
    """
    text = (text or '').strip()
    if not text:
        return {'allowed': True, 'blocked': False, 'reasons': []}

    # Try Gemini/Generative AI classification if configured
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if api_key and genai:
        try:
            genai.configure(api_key=api_key)
            # Use a text classification call if available. The exact API names
            # may vary; we'll use a conservative approach: ask model to classify.
            # This is a best-effort integration; if it fails, fallback to local.
            model = getattr(genai, 'TextClassifier', None)
            # If TextClassifier class exists, use it (not guaranteed); else use prompt-based
            if model:
                classifier = model()
                result = classifier.classify(text)
                # Expected structure varies; inspect result for flags
                # For safety, if we can't interpret, fallback
                # This placeholder assumes result.labels with severity
                labels = getattr(result, 'labels', None)
                if labels:
                    reasons = [str(l) for l in labels]
                    blocked = any('abuse' in r.lower() or 'sexual' in r.lower() or 'violence' in r.lower() for r in reasons)
                    return {'allowed': not blocked, 'blocked': blocked, 'reasons': reasons}

            # Prompt-based fallback: ask model to answer yes/no if text is toxic/contains links
            prompt = (
                "Classify the following user comment for moderation.\n"
                "Respond only with a JSON object with fields: blocked (true/false) and reasons (list).\n"
                "Reasons should be values like 'profanity','sexual_content','violence','self_harm','link','spam'.\n"
                f"Comment: '''{text}'''\n"
            )
            # Use genai.predict if available
            if hasattr(genai, 'predict'):
                resp = genai.predict(model='text-bison-001', input=prompt)
                out = getattr(resp, 'text', None) or str(resp)
                # Try to parse JSON from output
                import json
                m = re.search(r'\{.*\}', out, re.S)
                if m:
                    try:
                        parsed = json.loads(m.group(0))
                        blocked = bool(parsed.get('blocked'))
                        reasons = parsed.get('reasons', []) or []
                        return {'allowed': not blocked, 'blocked': blocked, 'reasons': reasons}
                    except Exception:
                        logger.exception('Failed to parse moderation JSON from Gemini response')

        except Exception:
            logger.exception('Gemini moderation call failed, falling back to local filter')

    # Local fallback
    return _local_check(text)
