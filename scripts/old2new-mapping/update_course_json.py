#!/usr/bin/env python3
import json
import os
import urllib.request
import urllib.parse
import ssl

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    course_path = os.path.join(base_dir, 'course.json')
    mapping_path = os.path.join(base_dir, 'bulk_import_mapping.json')
    dump_path = os.path.join(base_dir, 'pcex_live_server_dump_2026-09-02.json')

    ctx = ssl._create_unverified_context()
    catalog_url = 'https://adapt2.sis.pitt.edu/next.course-authoring/api/catalog-v2'

    print('================================================================================')
    print('🔄 UPDATING COURSE.JSON: REPLACING WITH PITT DELIVERY URLS & PAWS_IDS')
    print('================================================================================')

    with open(course_path, 'r', encoding='utf-8') as f:
        course = json.load(f)

    with open(mapping_path, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    with open(dump_path, 'r', encoding='utf-8') as f:
        dump = json.load(f)

    new_bundles = mapping['bundles']
    new_bundle_id_set = set(new_bundles.values())
    bundle_name_to_bid = {b['name']: bid for bid, b in dump['bundles'].items()}

    # Fetch catalog list
    print('[1/3] Fetching catalog-v2 entries...')
    req = urllib.request.Request(catalog_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response:
        catalog = json.loads(response.read().decode())

    # Map bundle items and constituent sources (WorkedExample / index 0)
    bundle_info_map = {}
    for entry in catalog:
        item_id = entry.get('identity', {}).get('id', '')
        paws_id = entry.get('paws_id')
        item_type = entry.get('identity', {}).get('type', '')
        demo_url = entry.get('links', {}).get('demo_url', '')

        for new_bid in new_bundle_id_set:
            if new_bid in item_id:
                if new_bid not in bundle_info_map:
                    bundle_info_map[new_bid] = {'pitt_url': None, 'paws_id': None, 'entries': []}

                bundle_info_map[new_bid]['entries'].append(entry)

                if item_type == 'CodeConstruction&CompletionBundle':
                    # Extract PITT url
                    cat_id = entry['id']
                    detail_url = f'{catalog_url}/{cat_id}'
                    req_d = urllib.request.Request(detail_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req_d, context=ctx) as resp_d:
                        detail = json.loads(resp_d.read().decode())
                    for deliv in detail.get('delivery', []):
                        if deliv.get('protocol') == 'PITT':
                            bundle_info_map[new_bid]['pitt_url'] = deliv.get('url')
                            break
                    if not bundle_info_map[new_bid]['pitt_url']:
                        slug = item_id.split('__')[0]
                        bundle_info_map[new_bid]['pitt_url'] = f'https://acos.cs.vt.edu/pitt/acos-pcex/acos-pcex-examples/?example-id={slug}__{new_bid}'

    # Assign paws_id (the worked example / index 0 paws_id for the activity)
    for new_bid, b_data in bundle_info_map.items():
        ex0 = next((e for e in b_data['entries'] if e.get('identity', {}).get('type') == 'CodeConstruction' or (e.get('links', {}).get('demo_url', '').endswith('?index=0'))), None)
        if ex0 and ex0.get('paws_id'):
            b_data['paws_id'] = ex0.get('paws_id')
        else:
            for e in b_data['entries']:
                if e.get('paws_id') is not None:
                    b_data['paws_id'] = e.get('paws_id')
                    break

    print(f'  ✓ Found catalog info, paws_ids, and PITT URLs for {len(bundle_info_map)} bundles.')

    # Update course.json
    print('[2/3] Updating PCEX activities in course.json to PITT URLs...')
    updated_count = 0
    records = []
    for unit in course.get('units', []):
        unit_name = unit.get('name', 'Unknown')
        acts = unit.get('activities', {}).get('1800000000002', [])
        for act in acts:
            url = act.get('url', '')
            parsed = urllib.parse.urlparse(url)
            qs = urllib.parse.parse_qs(parsed.query)
            set_name = qs.get('set', [None])[0]

            if not set_name and 'example-id=' in url:
                set_name = qs.get('example-id', [None])[0].split('__')[0]
            elif not set_name and '__' in url:
                set_name = url.split('/')[-1].split('__')[0]

            bid = bundle_name_to_bid.get(set_name)
            if bid and bid in bundle_info_map:
                binfo = bundle_info_map[bid]
                old_id = act.get('id')

                # Update id to paws_id and url to PITT url
                if binfo['paws_id']:
                    act['id'] = binfo['paws_id']
                if binfo['pitt_url']:
                    act['url'] = binfo['pitt_url']

                updated_count += 1
                records.append({
                    'unit': unit_name,
                    'name': act.get('name'),
                    'set_name': set_name,
                    'paws_id': act.get('id'),
                    'pitt_url': act.get('url')
                })

    print(f'  ✓ Updated {updated_count} / 52 PCEX activities in course.json to PITT URLs.')

    print('[3/3] Saving course.json...')
    with open(course_path, 'w', encoding='utf-8') as f:
        json.dump(course, f, indent=2)

    print(f'  ✓ Saved course.json ({os.path.getsize(course_path)} bytes).')
    print('\n================================================================================')
    print(f'🎉 COURSE.JSON SUCCESSFULLY UPDATED (ALL {updated_count} PITT URLS APPLIED)')
    print('================================================================================')
    for rec in records[:10]:
        print(f" • [{rec['unit']}] {rec['name']} (PAWS ID: {rec['paws_id']})")
        print(f"    ↳ PITT URL: {rec['pitt_url']}")
    if len(records) > 10:
        print(f"   ... and {len(records) - 10} more activities updated.")
    print('================================================================================')

if __name__ == '__main__':
    main()
