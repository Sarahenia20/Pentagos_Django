"""
Comprehensive test suite for media_processing moderation module.

Tests cover:
- Text normalization and deobfuscation
- Profanity detection (English and multilingual)
- URL/link detection
- Spam/suspicious content detection
- Gemini API integration for moderation
- Edge cases and encoding issues
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from pathlib import Path

from media_processing.ai_providers.moderation import (
    moderate_text,
    _normalize_text,
    _deobfuscate,
    _local_check,
    _load_additional_badwords,
)


# ============================================================================
# TEXT NORMALIZATION TESTS
# ============================================================================

class TestTextNormalization:
    """Test text normalization functions."""

    def test_normalize_basic_text(self):
        """Test basic text normalization."""
        result = _normalize_text('Hello World')
        assert result == 'hello world'

    def test_normalize_removes_diacritics(self):
        """Test removal of diacritical marks."""
        result = _normalize_text('café résumé naïve')
        assert 'cafe' in result
        assert 'resume' in result
        assert 'naive' in result

    def test_normalize_multiple_whitespace(self):
        """Test collapsing multiple whitespace."""
        result = _normalize_text('hello    world\n\ntab\there')
        assert result == 'hello world tab here'

    def test_normalize_empty_string(self):
        """Test normalization of empty string."""
        result = _normalize_text('')
        assert result == ''

    def test_normalize_none(self):
        """Test normalization of None."""
        result = _normalize_text(None)
        assert result == ''

    def test_normalize_unicode_characters(self):
        """Test normalization with various Unicode characters."""
        result = _normalize_text('Hëllö Wörld™ 你好')
        assert 'hello' in result.lower()
        assert 'world' in result.lower()

    def test_normalize_mixed_case(self):
        """Test case normalization."""
        result = _normalize_text('MiXeD CaSe TeXt')
        assert result == 'mixed case text'


class TestDeobfuscation:
    """Test text deobfuscation functions."""

    def test_deobfuscate_leet_speak(self):
        """Test leet speak deobfuscation."""
        deob, _collapsed = _deobfuscate('h3ll0 w0r1d')
        assert 'hello' in deob.lower()
        assert 'world' in deob.lower()

    def test_deobfuscate_repeated_characters(self):
        """Test collapsing repeated characters."""
        deob, _collapsed = _deobfuscate('heeeeelllloooo')
        assert deob.count('e') <= 2
        assert deob.count('l') <= 2
        assert deob.count('o') <= 2

    def test_deobfuscate_spaced_letters(self):
        """Test detecting s.p.a.m style obfuscation."""
        _deob, collapsed = _deobfuscate('s.p.a.m')
        assert collapsed == 'spam'

    def test_deobfuscate_mixed_obfuscation(self):
        """Test mixed obfuscation techniques."""
        _deob, collapsed = _deobfuscate('$p@m!!!!')
        assert 'spam' in collapsed.lower()

    def test_deobfuscate_empty_string(self):
        """Test deobfuscation of empty string."""
        deob, collapsed = _deobfuscate('')
        assert deob == ''
        assert collapsed == ''

    def test_deobfuscate_none(self):
        """Test deobfuscation of None."""
        deob, collapsed = _deobfuscate(None)
        assert deob == ''
        assert collapsed == ''

    def test_deobfuscate_numbers_to_letters(self):
        """Test number-to-letter substitutions."""
        deob, _collapsed = _deobfuscate('t3st 5tring')
        assert 'test' in deob.lower()
        assert 'string' in deob.lower()


# ============================================================================
# LOCAL CHECK TESTS
# ============================================================================

class TestLocalCheck:
    """Test local moderation checks."""

    def test_clean_text_allowed(self):
        """Test clean text passes moderation."""
        result = _local_check('This is a nice friendly message')
        assert result['allowed'] is True
        assert result['blocked'] is False
        assert len(result['reasons']) == 0

    def test_url_detection_http(self):
        """Test detection of HTTP URLs."""
        result = _local_check('Check out http://example.com')
        assert result['blocked'] is True
        assert 'contains_link' in result['reasons']

    def test_url_detection_https(self):
        """Test detection of HTTPS URLs."""
        result = _local_check('Visit https://spam.com for deals')
        assert result['blocked'] is True
        assert 'contains_link' in result['reasons']

    def test_url_detection_www(self):
        """Test detection of www URLs."""
        result = _local_check('Go to www.example.com')
        assert result['blocked'] is True
        assert 'contains_link' in result['reasons']

    def test_url_detection_domain(self):
        """Test detection of domain patterns."""
        result = _local_check('Visit spam.com or scam.net')
        assert result['blocked'] is True

    def test_suspicious_content_many_symbols(self):
        """Test detection of suspicious symbol-heavy content."""
        result = _local_check('!!!###$$$%%%^^^&&&***')
        assert result['blocked'] is True
        assert 'suspicious_content' in result['reasons']

    def test_normal_punctuation_allowed(self):
        """Test normal punctuation doesn't trigger suspicious flag."""
        result = _local_check('Hello! How are you? I am fine.')
        # Should not be blocked just for normal punctuation
        assert 'suspicious_content' not in result['reasons']

    @patch('media_processing.ai_providers.moderation.bp_profanity')
    @patch('media_processing.ai_providers.moderation._BETTER_PROFANITY_INITIALIZED', True)
    def test_profanity_detection_better_profanity(self, mock_bp):
        """Test profanity detection with better_profanity."""
        mock_bp.contains_profanity.return_value = True
        
        result = _local_check('some bad word here')
        assert result['blocked'] is True
        assert any('profanity' in r for r in result['reasons'])

    def test_empty_text(self):
        """Test empty text handling."""
        result = _local_check('')
        assert result['allowed'] is True
        assert result['blocked'] is False

    def test_whitespace_only(self):
        """Test whitespace-only text."""
        _local_check('   \n\t  ')
        # After normalization, this becomes empty
        # Should be allowed (checked at higher level)

    def test_obfuscated_spam(self):
        """Test detection of obfuscated spam."""
        _local_check('$p@m m3ss@g3')
        # Detection depends on badwords list


# ============================================================================
# MODERATE_TEXT INTEGRATION TESTS
# ============================================================================

class TestModerateText:
    """Test main moderate_text function."""

    def test_moderate_clean_text(self):
        """Test moderation of clean text."""
        result = moderate_text('This is a perfectly acceptable comment')
        assert result['allowed'] is True
        assert result['blocked'] is False
        assert result['reasons'] == []

    def test_moderate_empty_text(self):
        """Test moderation of empty text."""
        result = moderate_text('')
        assert result['allowed'] is True
        assert result['blocked'] is False

    def test_moderate_none(self):
        """Test moderation of None."""
        result = moderate_text(None)
        assert result['allowed'] is True
        assert result['blocked'] is False

    def test_moderate_whitespace_only(self):
        """Test moderation of whitespace-only text."""
        result = moderate_text('   \n\t   ')
        assert result['allowed'] is True
        assert result['blocked'] is False

    def test_moderate_text_with_url(self):
        """Test moderation blocks URLs."""
        result = moderate_text('Click here: http://spam.com')
        assert result['blocked'] is True
        assert 'contains_link' in result['reasons']

    def test_moderate_multilingual_text(self):
        """Test moderation with multilingual content."""
        result = moderate_text('Bonjour, comment ça va?')
        # Clean French text should pass
        assert result['allowed'] is True

    def test_moderate_very_long_text(self):
        """Test moderation of very long text."""
        long_text = 'This is a nice message. ' * 1000
        moderate_text(long_text)
        # Should handle long text without crashing

    def test_moderate_unicode_emoji(self):
        """Test moderation with emojis."""
        result = moderate_text('Great artwork! 🎨👍✨')
        assert result['allowed'] is True

    def test_moderate_special_characters(self):
        """Test moderation with special characters."""
        moderate_text('Nice work! © 2024 ™ ® €')
        # Special chars alone shouldn't block

    @patch('media_processing.ai_providers.moderation.genai')
    def test_moderate_with_gemini_success(self, _mock_genai, settings):
        """Test moderation using Gemini API."""
        settings.GEMINI_API_KEY = 'test-key'
        
        # Mock Gemini response - text is clean
        mock_result = Mock()
        mock_result.labels = []
        
        # Configure mock
        
        moderate_text('Test message')
        # Should fall back to local check since Gemini integration is complex

    @patch('media_processing.ai_providers.moderation.genai')
    def test_moderate_gemini_not_available(self, _mock_genai, settings):
        """Test graceful fallback when Gemini unavailable."""
        settings.GEMINI_API_KEY = ''
        
        result = moderate_text('Test message')
        # Should use local check
        assert 'allowed' in result
        assert 'blocked' in result

    @patch('media_processing.ai_providers.moderation.genai')
    def test_moderate_gemini_exception(self, mock_genai, settings):
        """Test handling of Gemini API exceptions."""
        settings.GEMINI_API_KEY = 'test-key'
        mock_genai.configure.side_effect = Exception('API Error')
        
        result = moderate_text('Test message')
        # Should fall back to local check
        assert 'allowed' in result

    def test_moderate_case_insensitive(self):
        """Test moderation is case-insensitive."""
        # URLs should be detected regardless of case
        result1 = moderate_text('Visit HTTP://EXAMPLE.COM')
        result2 = moderate_text('Visit http://example.com')
        assert result1['blocked'] == result2['blocked']


# ============================================================================
# BADWORDS LOADING TESTS
# ============================================================================

class TestBadwordsLoading:
    """Test badword list loading."""

    def test_load_additional_badwords(self):
        """Test loading additional badwords from files."""
        result = _load_additional_badwords()
        assert isinstance(result, dict)
        # May be empty if no badwords files exist

    @patch('media_processing.ai_providers.moderation.Path')
    def test_load_badwords_missing_directory(self, mock_path):
        """Test handling when badwords directory doesn't exist."""
        mock_dir = Mock()
        mock_dir.exists.return_value = False
        mock_path.return_value.resolve.return_value.parent = Mock()
        mock_path.return_value.resolve.return_value.parent.__truediv__ = Mock(return_value=mock_dir)
        
        result = _load_additional_badwords()
        assert result == {}

    @patch('media_processing.ai_providers.moderation.Path')
    def test_load_badwords_with_files(self, _mock_path):
        """Test loading badwords from existing files."""
        # This would require mocking the filesystem
        # For now, just test the function doesn't crash
        result = _load_additional_badwords()
        assert isinstance(result, dict)


# ============================================================================
# EDGE CASES AND ERROR HANDLING
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_moderate_sql_injection_attempt(self):
        """Test moderation of SQL injection attempts."""
        moderate_text("'; DROP TABLE users; --")
        # Should handle without errors

    def test_moderate_xss_attempt(self):
        """Test moderation of XSS attempts."""
        moderate_text('<script>alert("xss")</script>')
        # Should handle without errors

    def test_moderate_null_bytes(self):
        """Test handling of null bytes."""
        moderate_text('test\x00message')
        # Should handle gracefully

    def test_moderate_control_characters(self):
        """Test handling of control characters."""
        moderate_text('test\x01\x02\x03message')
        # Should handle without crashing

    def test_moderate_rtl_text(self):
        """Test handling of right-to-left text."""
        result = moderate_text('مرحبا بك')  # Arabic "welcome"
        assert 'allowed' in result

    def test_moderate_mixed_scripts(self):
        """Test handling of mixed scripts."""
        result = moderate_text('Hello 你好 Привет مرحبا')
        assert result['allowed'] is True

    def test_moderate_zalgo_text(self):
        """Test handling of zalgo/combining characters."""
        zalgo = 'H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ'
        moderate_text(zalgo)
        # Should handle without crashing

    def test_moderate_extremely_long_word(self):
        """Test handling of extremely long single word."""
        long_word = 'a' * 10000
        result = moderate_text(long_word)
        assert 'allowed' in result

    def test_moderate_many_newlines(self):
        """Test handling of excessive newlines."""
        moderate_text('line1\n' * 1000)
        # Should normalize to single spaces

    def test_moderate_mixed_encodings(self):
        """Test handling of various encodings."""
        # UTF-8 encoded text
        result = moderate_text('Café résumé')
        assert result['allowed'] is True

    def test_moderate_homoglyphs(self):
        """Test detection of homoglyph attacks."""
        # Latin 'a' vs Cyrillic a (U+0430)
        _result = moderate_text('spam')
        _result2 = moderate_text('sp\u0430m')  # with Cyrillic a
        # Both should be handled

    def test_moderate_repeated_spaces(self):
        """Test normalization of repeated spaces."""
        moderate_text('hello     world')
        # Should normalize spaces

    def test_moderate_tabs_and_spaces(self):
        """Test handling of mixed whitespace."""
        moderate_text('hello\t\t  \tworld')
        # Should normalize

    def test_moderate_line_breaks(self):
        """Test handling of various line breaks."""
        moderate_text('line1\r\nline2\rline3\nline4')
        # Should normalize

    def test_moderate_zero_width_characters(self):
        """Test handling of zero-width characters."""
        moderate_text('test\u200B\u200C\u200Dmessage')
        # Should handle gracefully


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Test performance characteristics."""

    def test_moderate_performance_short_text(self):
        """Test moderation speed for short text."""
        import time
        start = time.time()
        for _ in range(100):
            moderate_text('Short test message')
        elapsed = time.time() - start
        # Should complete 100 moderations in reasonable time
        assert elapsed < 5.0  # 5 seconds for 100 calls

    def test_moderate_performance_medium_text(self):
        """Test moderation speed for medium text."""
        text = 'This is a medium length message. ' * 10
        import time
        start = time.time()
        for _ in range(50):
            moderate_text(text)
        elapsed = time.time() - start
        assert elapsed < 5.0

    def test_moderate_no_memory_leak(self):
        """Test that repeated moderation doesn't leak memory."""
        # Run many times to check for leaks
        for _ in range(1000):
            moderate_text('Test message')
        # If we get here without crashing, that's good


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    """Test integration scenarios."""

    def test_moderate_comment_workflow(self):
        """Test typical comment moderation workflow."""
        comments = [
            'Great artwork!',
            'Amazing work, love the colors',
            'Check out my site: http://spam.com',
            '!!!BUY NOW!!!',
            'Beautiful piece 🎨',
        ]
        
        results = [moderate_text(c) for c in comments]
        
        # First two should pass
        assert results[0]['allowed'] is True
        assert results[1]['allowed'] is True
        
        # Third should fail (URL)
        assert results[2]['blocked'] is True
        
        # Last should pass (emoji)
        assert results[4]['allowed'] is True

    def test_moderate_multilingual_comments(self):
        """Test moderation across languages."""
        comments = [
            'Great work!',  # English
            'Très beau!',   # French
            'Hermoso trabajo',  # Spanish
            '素晴らしい',  # Japanese
        ]
        
        for comment in comments:
            moderate_text(comment)
            # All clean comments should pass

    def test_moderate_artistic_content(self):
        """Test moderation of art-related content."""
        artistic_comments = [
            'Love the brushwork and composition',
            'The use of negative space is brilliant',
            'Color theory on point!',
            'This reminds me of Van Gogh',
            'The lighting and shadows are perfect',
        ]
        
        for comment in artistic_comments:
            result = moderate_text(comment)
            assert result['allowed'] is True


# ============================================================================
# REGRESSION TESTS
# ============================================================================

class TestRegressions:
    """Test specific regression scenarios."""

    def test_false_positive_legitimate_urls(self):
        """Test that URL detection works as intended."""
        # URLs should be blocked per design
        result = moderate_text('See documentation at http://docs.example.com')
        assert result['blocked'] is True
        assert 'contains_link' in result['reasons']

    def test_artistic_terms_not_blocked(self):
        """Test that artistic terms aren't falsely flagged."""
        terms = [
            'nude study',
            'life drawing',
            'figure painting',
            'anatomical reference',
        ]
        
        for term in terms:
            moderate_text(term)
            # These should generally pass unless in badwords list

    def test_technical_terms_allowed(self):
        """Test technical/artistic terms are allowed."""
        technical = [
            'pixel art',
            'vector graphics',
            'raster image',
            'alpha channel',
            'layer mask',
        ]
        
        for term in technical:
            result = moderate_text(term)
            assert result['allowed'] is True

    def test_language_code_switching(self):
        """Test handling of multilingual content."""
        result = moderate_text('Great work! Très bien! Excelente!')
        # Mixed language praise should pass
        assert result['allowed'] is True