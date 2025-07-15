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

app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

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
    },
    {
        "role": "model",
        "parts": ["Understood! I will provide concise, student-friendly recommendations based on the transfer requirements."]
    }
])

majorHelper = genai.GenerativeModel("gemini-1.5-pro")
majorChat = majorHelper.start_chat(history=[
    {
        "role": "user",
        "parts": [
            "You are a helpful and friendly chatbot designed to assist students in choosing a college major.\n\n"
            "First, say the name of the college the student is attending that was selected.\n"
            "Then, ask thoughtful follow-up questions if the student is vague — such as:\n"
            "- What subjects do you enjoy?\n"
            "- Do you have any hobbies, career goals, or dream jobs?\n"
            "- Are you planning to transfer to a university or enter the workforce after this?\n\n"
            "Use only the list of programs provided in the prompt to make suggestions. Recommend a few possible majors and briefly explain why they might be a good fit.\n\n"
            "If the student asks about program types, here are the meanings:\n"
            "- AS = Associate in Science: A 2-year degree for technical careers or further study.\n"
            "- AA = Associate in Arts: A 2-year degree in liberal arts or social sciences.\n"
            "- AS-T = Associate in Science for Transfer: Guarantees CSU transfer in a STEM/technical field.\n"
            "- AA-T = Associate in Arts for Transfer: Guarantees CSU transfer in an arts/social science major.\n"
            "- CA = Certificate of Achievement: Focused, shorter than a degree, job-oriented.\n"
            "- CS = Certificate of Specialization: Very short, niche skills.\n"
            "- SC = Skills Certificate: Hands-on, not always transcripted.\n"
            "- BS = Bachelor of Science: A 4-year degree in STEM fields."
        ]
    },
    {
        "role": "model",
        "parts": [
            "Got it! I’ll be supportive, clear, and ask helpful questions when needed. Ready to help students choose a great major."
        ]
    }
])

undeclaredSchedule = genai.GenerativeModel("gemini-1.5-pro")
undeclaredChat = undeclaredSchedule.start_chat(history=[
    {
        "role": "user",
        "parts": [
            "You are a smart, friendly, and helpful academic counselor for California community college students who want to transfer to UC or CSU schools.\n\n"

            "You can receive:\n"
            "- Parsed transcripts (completed courses)\n"
            "- IGETC general ed requirements\n"
            "- Major prep requirements from articulation agreements\n"
            "- A planning window (e.g., Fall 2024 to Spring 2026)\n\n"

            "Always:\n"
            "1. Exclude completed courses from recommendations, but summarize them briefly.\n"
            "2. Follow prerequisites in order.\n"
            "3. Do not double-count courses unless IGETC allows it.\n"
            "4. Label each course with its purpose (e.g., IGETC 3A, UC Davis major requirement).\n"
            "5. Spread out the schedule evenly across semesters.\n"
            "6. If no major is given, build a schedule to fully complete IGETC.\n"
            "7. End by encouraging the student to meet with a real counselor.\n"
            "8. If the student replies with 'change plan', start a new schedule using the latest data.\n\n"

            "Make your tone warm, human, and empowering — you're not just a chatbot; you're an academic mentor."
        ]
    },
    {
        "role": "model",
        "parts": [
            "Understood! I'll guide students through clear, helpful schedules, follow all rules, and keep things supportive and accurate. Let’s help them feel confident in their path!"
        ]
    }
])

@app.route("/professor-reccomendation", methods=["POST"])
def ask():
    try:
        data = request.json
        user_input = data.get("question", "")
        if not user_input:
            return jsonify({"error": "Missing user question"}), 400
        
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

    if not os.path.exists(transferRequirementFile):
        return jsonify({"error": f"Transfer requirement file not found at {transferRequirementFile}"}), 404

    with open(transferRequirementFile, 'r') as f:
        requirements = json.load(f)

    prompt = f"Here are the transfer requirements: {json.dumps(requirements)}\n\nUser question: {data.get('question')}"
    response = transferChat.send_message(prompt)
    output = response.text.strip()

    return jsonify({"response": output })

@app.route("/upload-transcript", methods=["POST"])
def upload_transcript():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file.seek(0)
    file_start = file.read(4)
    file.seek(0)

    if not (
        file.filename.lower().endswith(".pdf") and
        file.mimetype == "application/pdf" and
        file_start.startswith(b"%PDF")
    ):
        return jsonify({"error": "Only valid PDF files are accepted."}), 400

    try:
        doc_data = file.read()

        prompt = (
            "Extract all courses as a JSON array with fields: "
            "term, subject, course number, and title. "
            "Make sure it's valid JSON."
        )

        response = model.generate_content([
            {"mime_type": "application/pdf", "data": doc_data},
            prompt
        ])

        return jsonify({
            "success": True,
            "parsedTranscript": response.text.strip()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/undeclared-schedule", methods=["POST"])
def scheduler():
    try:
        data = request.json
        user_input = data.get("question", "")
        parsed_transcript = data.get("parsedTranscript", {})
        current_school = data.get("currentSchool", "")
        transfer_school = data.get("transferSchool", "")
        major = data.get("major", "").strip().lower()
        start_semester = data.get("startSemester", "")
        end_semester = data.get("endSemester", "")

        if not user_input:
            return jsonify({"error": "Missing user question"}), 400

        with open('TransferData/IGETC/igetcs_data.json', 'r') as f:
            igetc = json.load(f)

        if current_school and transfer_school and major and major != "undeclared":
            major_path = getMajorFile(current_school, transfer_school, major)
            if not os.path.exists(major_path):
                return jsonify({"error": "Transfer requirement file not found"}), 404

            with open(major_path, 'r') as f:
                requirements = json.load(f)

            prompt = f"""
                The student is asking: {user_input}

                Start semester: {start_semester or "Not specified"}
                End semester: {end_semester or "Not specified"}

                {f"Here is their parsed transcript (courses they have already completed):\n{json.dumps(parsed_transcript)}" if parsed_transcript else ""}

                Here are the transfer requirements for their chosen major:
                {json.dumps(requirements)}

                Here are the general education (IGETC) requirements:
                {json.dumps(igetc)}

                Please consider what they've already taken (if available), the GE requirements, and their major to build a smart, multi-semester plan that respects prerequisites.
            """
        else:
            prompt = f"""
                The student is asking: {user_input}

                Start semester: {start_semester or "Not specified"}
                End semester: {end_semester or "Not specified"}

                Here are the general education (IGETC) requirements:
                {json.dumps(igetc)}

                Please build a GE-based schedule for an undecided student starting from scratch.
            """

        response = undeclaredChat.send_message(prompt)
        output = response.text.strip()
        return jsonify({ "response": output })

    except Exception as e:
        return jsonify({ "error": str(e) }), 500
    
@app.route("/major-helper", methods=["POST"])
def major_helper():
    data = request.get_json()

    current_school_for_major = data.get('storedCurrentSchoolForMajorHelp')

    Programs = getCollegeMajorFile(current_school_for_major)

    if not os.path.exists(Programs):
        return jsonify({"error": "Programs file not found"}), 404
    
    with open(Programs, 'r') as f:
        programs = json.load(f)

    prompt = f"Here are the list of Programs: {json.dumps(programs)}\n\nUser question: {data.get('question')}"
    response = majorChat.send_message(prompt)
    output = response.text.strip()

    return jsonify({"response": output })

def getCollegeMajorFile(storedCurrentSchoolForMajorHelp):
    file_map = {
        "Skyline College": "ScrapedData/Skyline_College_Majors.json",
        "College of San Mateo": "ScrapedData/College_Of_San_Mateo_Majors.json",
        "Canada College": "ScrapedData/Canada_College_Majors.json"
    }
    return file_map.get(storedCurrentSchoolForMajorHelp)
    
def getMajorFile(currentSchool, transferSchool, major):
    majorFormatted = major.replace(" ", "_")
    base_path = os.path.dirname(__file__)
    filePath = os.path.join(base_path, "TransferData", currentSchool, transferSchool, f"{majorFormatted}.json")
    if (major == "undeclared"):
        filePath = os.path.join(base_path, "TransferData", currentSchool, transferSchool, "undeclared.json")
    
    return filePath

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))