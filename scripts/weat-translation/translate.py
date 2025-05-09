import os
import json
import yaml
from openai import OpenAI

client = OpenAI(
    api_key=open("./openai_key.txt").read().strip(),
)

for i, activity_fn in enumerate(os.listdir("./activities")):
    activity = json.load(open(f"./activities/{activity_fn}"))[0]
    print("processing activity", activity["activityName"])
    for j, goal in enumerate(activity["activityGoals"]):
        print("  processing goal", goal["activityName"])

        if os.path.exists(f"./activities-output/{i}-{j}_{activity_fn}.raw"):
            print("  already exists, skiped!")
            continue

        template = yaml.safe_load(open("./template.yaml"))

        prompt = template["prompt"]
        prompt = prompt.replace("<<target-language>>", "Spanish")
        prompt = prompt.replace("<<program-name>>", goal["activityName"])
        prompt = prompt.replace("<<program-description>>", goal["goalDescription"])

        prompt = prompt.replace(
            "<<source-code>>",
            "\n".join(
                [
                    template["source-code"]
                    .replace("<<line-number>>", str(i + 1).zfill(2))
                    .replace("<<line-content>>", line["content"])
                    for i, line in enumerate(goal["lineList"])
                ]
            ),
        )

        line_expls = [
            template["line-explanations"]
            .replace("<<line-number>>", str(line["number"]).zfill(2))
            .replace("<<explanation-number>>", str(i + 1).zfill(2))
            .replace("<<explanation-content>>", comment)
            for line in goal["lineList"]
            for i, comment in enumerate(line["commentList"])
        ]
        prompt = prompt.replace(
            "<<line-explanations>>",
            "\n".join(line_expls) if len(line_expls) > 0 else "[EMPTY-LIST]",
        )

        dist_expls = [
            (
                template["line-distractors"]["line-content"]
                .replace("<<distractor-number>>", str(i + 1).zfill(2))
                .replace("<<line-content>>", distractor["line"]["content"])
                + "\n"
                + template["line-distractors"]["line-explanation"]
                .replace("<<distractor-number>>", str(i + 1).zfill(2))
                .replace("<<line-explanation>>", comment)
            )
            for i, distractor in enumerate(goal["distractorList"])
            for comment in distractor["line"]["commentList"]
        ]
        prompt = prompt.replace(
            "<<line-distractors>>",
            "\n".join(dist_expls) if len(dist_expls) > 0 else "[[EMPTY-LIST]]",
        )

        open(f"./activities-output/{i}-{j}_{activity_fn}.in", "w").write(
            prompt[
                prompt.find("[[PROGRAM-NAME]]") : prompt.rfind("[[TASK-INSTRUCTIONS]]")
            ]
        )
        print("  input prepared and saved!")

        open(f"./activities-output/{i}-{j}_{activity_fn}.prompt", "w").write(prompt)
        print("  prompt prepared and saved!")

        system_msg = {
            "role": "system",
            "content": [
                {
                    "type": "input_text",
                    "text": "You are a professional translator and experienced programmer.",
                }
            ],
        }
        user_msg = {
            "role": "user",
            "content": [{"type": "input_text", "text": prompt}],
        }

        print("  translating ...")

        open(f"./activities-output/{i}-{j}_{activity_fn}.msgs", "w").write(
            json.dumps({"system": system_msg, "user": user_msg}, indent=2)
        )

        generation = client.responses.create(
            model="gpt-4o-mini",
            input=[system_msg, user_msg],
            text={"format": {"type": "text"}},  # Format of the input text
            temperature=0,  # Temperature for randomness
            max_output_tokens=8192,  # Max tokens for the output
        )

        open(f"./activities-output/{i}-{j}_{activity_fn}.out.raw", "w").write(
            str(generation)
        )

        open(f"./activities-output/{i}-{j}_{activity_fn}.out", "w").write(
            generation.output[0].content[0].text
        )

        print("  translation completed!")

        print()