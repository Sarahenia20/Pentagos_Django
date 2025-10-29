from django.core.management.base import BaseCommand
from media_processing.ai_providers.moderation import moderate_text


class Command(BaseCommand):
    help = 'Run quick moderation tests against sample texts using moderate_text()'

    def add_arguments(self, parser):
        parser.add_argument('--samples', nargs='*', help='Sample texts to test. If omitted, defaults are used.')

    def handle(self, *args, **options):
        samples = options.get('samples')
        if not samples:
            samples = [
                'This is a harmless comment, hello world!',
                'Check out http://spam.example.com for free prizes',
                'You are an idiot',
                'Esto es una mierda',
                'Ceci est une arnaque',
                '5p4m is obfuscated spam',
            ]

        for s in samples:
            res = moderate_text(s)
            self.stdout.write(self.style.NOTICE(f'Text: {s}'))
            self.stdout.write(self.style.SUCCESS(f'  Result: allowed={res.get("allowed")}, blocked={res.get("blocked")}, reasons={res.get("reasons")}'))
