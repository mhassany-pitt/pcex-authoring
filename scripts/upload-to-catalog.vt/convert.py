import os
import json
import requests

# # --- load json for each activity
# pcex = json.load(open('./hub-activities.json'))
# load_url = 'http://adapt2.sis.pitt.edu/pcex-authoring/api/hub/{PLACEHOLDER}?_t=1740098017838'
# for ex in pcex:
#     url = load_url.replace('{PLACEHOLDER}', ex['id'])
#     ex_json = requests.get(url).json()
#     ex_json[0]['author'] = ex['author']
#     ex_json[0]['_id'] = ex['id']
#     json.dump(ex_json, open(f'./hub-activities/{ex["id"]}.json', 'w'), indent=2)
#     print(f'Exported {ex["id"]}.json')

institute_map = {
    "@dmi.uns.ac.rs": "University of Novi Sad",
    "@usn.no": "University of South-Eastern Norway",
    "@pitt.edu": "University of Pittsburgh",
    "@gmail.com": "University of Pittsburgh",
}

cvt_json = []
for ex_id in os.listdir('./hub-activities'):
    if not ex_id.endswith('.json'):
        continue
    ex = json.load(open(f'./hub-activities/{ex_id}'))
    name = f"{ex[0]['activityName'].replace(' ', '_').replace('.', '_').replace('(', '_').replace(')', '_')}__{ex[0]['_id']}"
    cvt = {
        "catalog_type": "SLCItemCatalog",
        "platform_name": "ACOS server",
        "url": "https://acos.cs.vt.edu",
        "exercise_type": "PCEX Activity",
        "license": "",
        "description": "",
        "author": ex[0]['author']['fullname'],
        "institution": institute_map['@' + ex[0]['author']['email'].split('@')[1]],
        "keywords": [],
        "exercise_name": ex[0]['activityName'],
        "language": ex[0]['language'][:1].upper() + ex[0]['language'][1:].lower(),
        "iframe_url": f"https://acos.cs.vt.edu/html/acos-pcex/acos-pcex-examples/{name}",
        "lti_url": f"https://acos.cs.vt.edu/lti/acos-pcex/acos-pcex-examples?resource_name={name}",
        "lti_instructions_url": "https://acos.cs.vt.edu/lti/instructions"
    }
    # -- validate iframe_url
    # st_code = requests.get(cvt['iframe_url']).status_code
    # print(f'[{st_code}]', '[ERROR]' if st_code != 200 else '', cvt['iframe_url'])
    cvt_json.append(cvt)

json.dump(cvt_json, open('./converted.json', 'w'), indent=2)