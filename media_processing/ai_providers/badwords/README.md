# Badwords lists

Place plain text files here to extend the moderation wordlists.
Each file should contain one token per line (lowercase preferred). Example filenames:

- `en.txt` — English words
- `fr.txt` — French words
- `es.txt` — Spanish words

Lines starting with `#` are ignored (comments).

Important: do not commit sensitive or private data. You can populate these files with curated word lists for your moderation needs.

The moderation system will automatically load any `*.txt` files in this folder on server start.
