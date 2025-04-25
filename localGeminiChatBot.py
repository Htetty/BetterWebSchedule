import os
import json
import re
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def load_all_professor_data():
    base_path = os.path.expanduser("~/Desktop/BetterWebSchedule/ScrapedData")
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
                print(f"[DEBUG] Loaded {len(data)} professors from {file}")
                for p in data:
                    p["source_school"] = file.replace("all_professors_", "").replace(".json", "")
                all_professors.extend(data)
        except FileNotFoundError:
            print(f"Note: {file} not found, skipping...")
        except Exception as e:
            print(f"Error reading {file}: {e}")
    
    print(f"[DEBUG] Total professors loaded: {len(all_professors)}")
    return all_professors

def estimate_gemini_cost(input_chars, output_chars):
    input_cost = (input_chars / 1000) * 0.000125
    output_cost = (output_chars / 1000) * 0.000375
    total_cost = input_cost + output_cost
    dollars = round(total_cost, 6)
    cents = round(total_cost * 100, 4)
    return dollars, cents

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
        "comm": "commuincations",
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

    # filter by department (substring match)
    if matched_department:
        profs_with_dept = [
            p for p in professors
            if matched_department in p.get("department", "").lower()
        ]
        if profs_with_dept:
            professors = profs_with_dept

    # fuzzy subject or name match
    filtered = []
    for prof in professors:
        dep = prof.get("department", "").lower()
        full_name = f"{prof.get('firstName', '')} {prof.get('lastName', '')}".lower()
        first = prof.get("firstName", "").lower()
        last = prof.get("lastName", "").lower()

        # match by department if mapped
        if matched_department and matched_department in dep:
            filtered.append(prof)
        # match by full name, first name, or last name
        elif full_name in input_lower or first in input_lower or last in input_lower:
            filtered.append(prof)

        if not filtered:
            filtered = professors

    # sorting
    if sort_by == "rating":
        filtered = sorted(filtered, key=lambda p: p.get("avgRating", 0), reverse=True)
    elif sort_by == "difficulty":
        filtered = sorted(filtered, key=lambda p: p.get("avgDifficulty", float("inf")))
    elif sort_by == "num_ratings":
        filtered = sorted(filtered, key=lambda p: p.get("numRatings", 0), reverse=True)
    elif sort_by == "take_again":
        filtered = sorted(filtered, key=lambda p: p.get("wouldTakeAgainPercent", 0), reverse=True)

    return filtered[:top_n]

professors = load_all_professor_data()
if not professors:
    print("Warning: No professor data was loaded. Please check the ScrapedData directory.")

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

print("Welcome to the SMCCD Professor Recommender!")
print("Type 'quit' to exit.\n")

while True:
    user_input = input("You: ").strip()
    if user_input.lower() in {"exit", "quit", "bye"}:
        print("Bot: Goodbye!")
        break

    try:
        relevant_profs = filter_professors(user_input, professors)

        # Debug log: see what you're sending
        print("[DEBUG] Professors being sent to Gemini:")
        for p in relevant_profs:
            print("-", p['firstName'], p['lastName'], "|", p['school']['name'])

        prof_snippet = json.dumps(relevant_profs)
        prompt = f"Here are some relevant professors: {prof_snippet}\n\nUser question: {user_input}"
        input_len = len(prompt)

        response = chat.send_message(prompt)
        output = response.text.strip()
        output_len = len(output)

        cost_dollars, cost_cents = estimate_gemini_cost(input_len, output_len)

        print("\nBot:", output)
        print(f"Estimated cost: ${cost_dollars} (≈ {cost_cents}¢)\n")

    except Exception as e:
        print(f"Error: {str(e)}")