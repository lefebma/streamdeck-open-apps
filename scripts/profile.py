"""Build a portable Neo profile using Stream Deck's native archive format."""
import json
import pathlib
import uuid
import zipfile

plugin = pathlib.Path('com.marclefebvre.openapps.sdPlugin')
plugin_version = json.loads((plugin / 'manifest.json').read_text())['Version']
profile_id = '948D0362-06E4-4F3F-8701-F4B82951EF33'
page_id = '74382431-1D94-42A6-885F-55BF0A418208'
manifest = {
    'Device': {'Model': '20GBJ9901', 'UUID': ''}, 'Name': 'Open Apps',
    'Pages': {'Current': page_id.lower(), 'Default': page_id.lower(), 'Pages': [page_id.lower()]},
    'Version': '3.0'
}
actions = {}
for slot in range(8):
    kind = 'app' if slot < 6 else 'previous' if slot == 6 else 'next'
    name = {'app': 'Live App', 'previous': 'Previous Apps', 'next': 'Next Apps'}[kind]
    actions[f'{slot % 4},{slot // 4}'] = {
        'ActionID': str(uuid.uuid5(uuid.NAMESPACE_URL, f'open-apps/slot/{slot}')),
        'LinkedTitle': True, 'Name': name,
        'Plugin': {'Name': 'Open Apps', 'UUID': 'com.marclefebvre.openapps', 'Version': plugin_version},
        'Settings': {}, 'State': 0, 'States': [{'TitleAlignment': 'bottom', 'FontSize': 10}],
        'UUID': f'com.marclefebvre.openapps.{kind}'
    }
page = {'Controllers': [{'Actions': None, 'Type': 'Neo'}, {'Actions': actions, 'Type': 'Keypad'}], 'Icon': '', 'Name': ''}
destination = plugin / 'profiles/open-apps.streamDeckProfile'
destination.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.writestr(f'{profile_id}.sdProfile/manifest.json', json.dumps(manifest, indent=2))
    archive.writestr(f'{profile_id}.sdProfile/Profiles/{page_id}/manifest.json', json.dumps(page, indent=2))
print('Built the portable Open Apps Neo profile.')
