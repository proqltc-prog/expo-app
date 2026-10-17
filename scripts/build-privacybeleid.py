# Bouwt docs/privacybeleid/index.html uit store/privacybeleid.md (WEEK-62).
# Het advertentiedeel wordt weggelaten zolang er geen advertenties zijn; zet het terug bij de AdMob-release.
import re, subprocess, pathlib, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
bron = (ROOT / 'store' / 'privacybeleid.md').read_text(encoding='utf-8')

# 1. Het NL-advertentiedeel (tot "## Hoe lang?") en de EN-advertentieregel weglaten.
bron = re.sub(r'## Advertenties\n.*?(?=## Hoe lang\?)', '', bron, flags=re.S)
bron = re.sub(r'^- \*\[Advertising section[^\n]*\n', '', bron, flags=re.M)

with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False, encoding='utf-8') as tmp:
    tmp.write(bron)
    tmp_pad = tmp.name

uit = ROOT / 'docs' / 'privacybeleid' / 'index.html'
uit.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(['pandoc', tmp_pad, '-s', '--metadata', 'title=Privacybeleid Famenu', '--metadata', 'lang=nl', '-o', str(uit)], check=True)

html = uit.read_text(encoding='utf-8')
css = '''<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:46rem;margin:0 auto;padding:1.25rem 1rem;line-height:1.6;color:#222;background:#fff}
h1,h2{line-height:1.25}
table{border-collapse:collapse;width:100%;font-size:.95rem}
td,th{border:1px solid #ddd;padding:.45rem;vertical-align:top;text-align:left}
th{background:#f4f4f4}
em{color:#555}
hr{border:0;border-top:1px solid #ddd;margin:2rem 0}
@media (prefers-color-scheme:dark){body{background:#151515;color:#eee}th{background:#262626}td,th{border-color:#444}em{color:#aaa}hr{border-color:#444}}
</style>'''
html = re.sub(r'<link rel="stylesheet" href="[^"]*" ?/?>', css, html)
# Dubbele titel uit het pandoc-kopblok weglaten; de body heeft al een H1.
html = re.sub(r'<header id="title-block-header">.*?</header>', '', html, flags=re.S)
uit.write_text(html, encoding='utf-8')
print('geschreven:', uit)
