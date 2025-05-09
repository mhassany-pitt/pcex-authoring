import json

catalog = {each['exercise_name']: each for each in json.load(open("./odsa_catalog.json"))}
items = [
    {"name": each.replace("https://splice.cs.vt.edu/item?item_link=", "").replace("%20", " "), "topic": topic, "type": type_}
    for topic, types in json.load(open("./opendsa.json")).items() 
    for type_, list_ in types.items() for each in list_
]

for item in items:
    cat_item = catalog[item["name"]]
    print(f"""INSERT INTO aggregate.ent_content (content_id, content_name, content_type, display_name, `desc`, url, `domain`, provider_id, comment, visible, creation_date, creator_id, privacy, author_name) 
            VALUES(null, 'opendsa-{item["name"].replace(" ", "-").lower()}', '{item["type"]}', '{item["name"]}', '{cat_item['description']}', '{cat_item['iframe_url']}', 'domain', '{item["type"]}', '', 1, '2025-04-17 19:47:54', '{cat_item['author']}', 'public', '{cat_item['author']}');""")
