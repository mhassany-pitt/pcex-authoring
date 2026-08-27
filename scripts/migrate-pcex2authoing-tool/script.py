import os
import json
import requests

api = 'http://adapt2.sis.pitt.edu/pcex-authoring'

ignore = [
    'JAVA_full.json',
    'JAVA_loan_tester.json',
    'JAVA_prior_201709052238.json',
    'JAVA_user_study.json',
    'JAVA_files.j_work_hours.json',
    'JAVA_csedpad.06.If.if_1.json',
]

filenames = [fn for fn in os.listdir('examples') if fn.endswith('.json')]
j = len(filenames)
i = 0
k = 0
for filename in filenames:
    if k > 200:
        break
    k += 1
    i += 1
    try:
        if os.path.exists(f'./examples/{filename}.done'):
            print(f'[{i}/{j}] File already processed {filename}')
            continue

        if filename in ignore:
            print(f'[{i}/{j}] File ignored {filename}')
            continue

        print(f'[{i}/{j}] Processing file {filename}')

        with open(f'./examples/{filename}', 'r') as f:
            filecontent = json.load(f)
        
        activity = {
            "published": True,
            "user": "moh70@pitt.edu",
            "name": filecontent['activityName'], 
            "items": [],
        }

        for goal in filecontent['activityGoals']:
            source = {"user": "moh70@pitt.edu"}
            source['name'] = goal['name'] or goal['activityName']
            source['description'] = goal['goalDescription']
            source['filename'] = goal['fileName']
            source['language'] = goal['language']
            source['distractors'] = [{
                'code': distractor['line']['content'],
                'description': ' '.join(distractor['line']['commentList'])
            } for distractor in goal['distractorList']]
            
            lines = goal['lineList']
            lines.sort(key=lambda x: x['number'])
            source['code'] = '\n'.join([line['content'] for line in lines])
            blanks = set([blank['line']['number'] for blank in goal['blankLineList']])
            
            source['lines'] = {str(line['number']): {
                "comments": [{"content": content} for content in line['commentList']],
                "blank": line['number'] in blanks
            } for line in lines}

            source['programInput'] = goal['userInput']

            activity['items'].append({
                "item": source,
                "type": "example" if goal['fullyWorkedOut'] else "challenge",
                "details": {
                    "name": source['name'],
                    "description": source['description'],
                }
            })

        for item in activity['items']:
            resp = requests.post(f'{api}/api/bulk/sources', json=item['item'])
            item['item'] = resp.json()['id']

        resp = requests.post(f'{api}/api/bulk/activities', json=activity)
        id = resp.json()['id']

        print(f'[{i}/{j}] Processed file {filename} =>', id)
        with open(f'./examples/{filename}.done', 'w') as f:
            f.write('')
    except Exception as e:
        print(f'[{i}/{j}] Error processing file {filename}: {e}')