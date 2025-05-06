import os
import json
import re
from dotenv import load_dotenv
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__)
CORS(app)


def load_all_professor_data():
    base_path = os.path.join(os.path.dirname(__file__), "ScrapedData")
    filenames = [
        "all_professors_CSM.json",
        "all_professors_Canada.json",
        "all_professors_Skyline.json"
    ]
    
    all_professors = []
    for file in filenames:
        path = os.path.join(base_path, file)
        try:
            with open(path, "r") as f:
                data = json.load(f)
                for p in data:
                    p["source_school"] = file.replace("all_professors_", "").replace(".json", "")
                all_professors.extend(data)
        except Exception as e:
            print(f"Error reading {file}: {e}")
    
    return all_professors


def filter_professors(user_input, professors):
    input_lower = user_input.lower()

    school_map = {
        "skyline": "skyline college",
        "csm": "college of san mateo",
        "san mateo": "college of san mateo",
        "canada": "cañada college",
        "cañada": "cañada college"
    }

    matched_school = None
    for keyword, school_name in school_map.items():
        if keyword in input_lower:
            matched_school = school_name
            break

    department_map = {
        "math": "mathematics",
        "chem": "chemistry",
        "phys": "physics",
        "econ": "economics",
        "cs": "computer science",
        "comm": "communications",
    }

    matched_department = None
    for keyword, department_name in department_map.items():
        if keyword in input_lower:
            matched_department = department_name
            break

    # rankings
    match = re.search(r"top (\d+)", input_lower)
    top_n = int(match.group(1)) if match else 5

    # sorting preferences
    sort_by = "rating"
    if any(word in input_lower for word in ["easy", "chill", "light", "not hard"]):
        sort_by = "difficulty"
    elif any(word in input_lower for word in ["popular", "well known", "lots of ratings"]):
        sort_by = "num_ratings"
    elif any(word in input_lower for word in ["recommend", "take again", "students love"]):
        sort_by = "take_again"

    # filter by school
    if matched_school:
        professors = [
            p for p in professors 
            if p.get("school", {}).get("name", "").lower().strip() == matched_school
        ]

    # filter by department
    if matched_department:
        profs_with_dept = [
            p for p in professors
            if matched_department in p.get("department", "").lower()
        ]
        if profs_with_dept:
            professors = profs_with_dept

    # fuzzy match by department or name
    filtered = []
    for prof in professors:
        dep = prof.get("department", "").lower()
        full_name = f"{prof.get('firstName', '')} {prof.get('lastName', '')}".lower()
        first = prof.get("firstName", "").lower()
        last = prof.get("lastName", "").lower()

        if matched_department and matched_department in dep:
            filtered.append(prof)
        elif full_name in input_lower or first in input_lower or last in input_lower:
            filtered.append(prof)

    # fallback if nothing matched
    if not filtered:
        filtered = professors

    # sort the results
    if sort_by == "rating":
        filtered = sorted(filtered, key=lambda p: p.get("avgRating", 0), reverse=True)
    elif sort_by == "difficulty":
        filtered = sorted(filtered, key=lambda p: p.get("avgDifficulty", float("inf")))
    elif sort_by == "num_ratings":
        filtered = sorted(filtered, key=lambda p: p.get("numRatings", 0), reverse=True)
    elif sort_by == "take_again":
        filtered = sorted(filtered, key=lambda p: p.get("wouldTakeAgainPercent", 0), reverse=True)

    # debug log (optional)
    print(f"[Filter Debug] Matched professors for '{user_input}': {[p['firstName'] + ' ' + p['lastName'] for p in filtered]}")

    return filtered[:top_n]

professors = load_all_professor_data()

model = genai.GenerativeModel("gemini-1.5-pro")
chat = model.start_chat(history=[
    {
        "role": "user",
        "parts": [
            "You are a helpful chatbot designed to assist students in choosing professors based on real-world rating data.\n\n"
            "You will receive a small list of professors with fields such as:\n"
            "- firstName\n- lastName\n- avgRating\n- avgDifficulty\n- numRatings\n- wouldTakeAgainPercent\n"
            "- department\n- school name\n- profileUrl\n\n"
            "Your job is to help users:\n"
            "1. Find top professors by subject/school\n"
            "2. Summarize professors by name\n"
            "3. Consider user preferences (e.g. easy vs hard)\n\n"
            "Keep answers short, natural, and informative."
        ]
    },
    {
        "role": "model",
        "parts": ["Understood! I will provide concise, student-friendly recommendations based on the professor list."]
    }
])

transferModel = genai.GenerativeModel("gemini-1.5-pro")
transferChat = transferModel.start_chat(history=[
    {
    "role": "user",
    "parts": [
            "You are a helpful and friendly chatbot designed to assist students in planning a possible 2-year, 4-semester transfer course schedule, including an optional summer term if needed. Your job is to help students based on their transfer requirements.\n\n",
            
            "Before diving into academic planning, respond naturally and politely to greetings or small talk. Be warm, conversational, and supportive—like a helpful academic advisor.\n\n",

            "You will receive a dataset of courses that students need to take. Your job is to:\n",
            "1. If the user asks for a list, provide a clean and simple list of courses only. Do not create a schedule.\n",
            "2. If the user asks for a schedule, provide an accurate course schedule that fits their needs.\n",
            "3. Let them know if there are any non-articulated (unapproved) courses in the dataset, but do not include these courses in any schedule.\n",
            "4. Remind students that your response is just a recommendation and they should confirm everything with an academic counselor.\n",
            "5. Make sure to say the title and units of each course too.\n",
            "6. Make sure the course schedule you create includes all required courses in the correct order when applicable (e.g., PHYS 250 → PHYS 260 → PHYS 270).\n\n",

            "Keep responses short, natural, student-friendly, and helpful."
        ]
    }
,
    {
        "role": "model",
        "parts": ["Understood! I will provide concise, student-friendly recommendations based on the transfer requirements."]
    }
])

@app.route("/professor-reccomendation", methods=["POST"])
def ask():
    try:
        data = request.json
        user_input = data.get("question", "")
        if not user_input:
            return jsonify({"error": "Missing user question"}), 40
        
        professors = load_all_professor_data()

        relevant_profs = filter_professors(user_input, professors)

        prof_snippet = json.dumps(relevant_profs)
        prompt = f"Here are some relevant professors: {prof_snippet}\n\nUser question: {user_input}"

        response = chat.send_message(prompt)
        output = response.text.strip()

        return jsonify({
            "response": output,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/transfer-plan", methods=["POST"])
def transfer_plan():
    data = request.get_json()
    current_school = data.get('currentSchool')
    transfer_school = data.get('transferSchool')
    major = data.get('major')

    transferRequirementFile = getMajorFile(current_school, transfer_school, major)
    print("Looking for file at:", transferRequirementFile)  # Shows up in terminal only


    if not os.path.exists(transferRequirementFile):
        return jsonify({"error": f"Transfer requirement file not found at {transferRequirementFile}"}), 404

    with open(transferRequirementFile, 'r') as f:
        requirements = json.load(f)

    prompt = f"Here are the transfer requirements: {json.dumps(requirements)}\n\nUser question: {data.get('question')}"
    response = transferChat.send_message(prompt)
    output = response.text.strip()

    return jsonify({"response": output })


# Function to get the major file (you might already have this defined)
def getMajorFile(currentSchool, transferSchool, major):
    majorFormatted = major.replace(" ", "_")
    filePath = f"./TransferData/{currentSchool}/{transferSchool}/{majorFormatted}.json"
    return filePath

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))