from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from collections import defaultdict
import time
import json
import os
import re

ccc_schools = [
    {"name": "Skyline College", "id": 127},
    {"name": "College of San Mateo", "id": 5},
    {"name": "Canada College", "id": 68}
]

transfer_schools = [
    {"name": "UC Davis", "id": 89},
    {"name": "UC Berkeley", "id": 79},
    {"name": "UC Santa Cruz", "id": 132},
    {"name": "UC San Diego", "id": 7},
    {"name": "UC Los Angeles", "id": 117},
    {"name": "UC Irvine", "id": 120},
    {"name": "UC Santa Barbara", "id": 128}
]

def extract_sending_courses(sending):
    courses = []
    course_blocks = sending.find_all("div", class_="courseLine")
    conjunctions = sending.find_all(lambda tag: tag.name == "div" and "conjunction" in tag.get("class", []))
    conj_iter = iter(conjunctions)
    for block in course_blocks:
        prefix = block.find("div", class_="prefixCourseNumber")
        title = block.find("div", class_="courseTitle")
        units = block.find("div", class_="courseUnits")
        course = {
            "prefix": prefix.get_text(strip=True) if prefix else "",
            "title": title.get_text(strip=True) if title else "",
            "units": units.get_text(strip=True) if units else "",
            "conjunction": ""
        }
        try:
            conj = next(conj_iter).get_text(strip=True).title()
            course["conjunction"] = conj
        except StopIteration:
            pass
        courses.append(course)
    return courses

def parse_major_block(major_tag, sibling_tags, sending_school, receiving_school):
    major_title = major_tag.get_text(strip=True)
    combined_html = ''.join(str(tag) for tag in sibling_tags)
    soup = BeautifulSoup(combined_html, "html.parser")

    area_titles = [h2.get_text(strip=True) for h2 in soup.find_all("h2", class_="areaTitle")]
    current_area_index = -1
    area_map = []
    for element in soup.find_all():
        if element.name == "h2" and "areaTitle" in element.get("class", []):
            current_area_index += 1
        if "sectionMain" in element.get("class", []):
            area_map.append(current_area_index)

    groups = []
    for i, section in enumerate(soup.select("div.sectionMain")):
        area_title = area_titles[area_map[i]] if i < len(area_map) and area_map[i] < len(area_titles) else ""

        letter_div = section.select_one(".sectionLetter .letterContent")
        label = letter_div.get_text(strip=True) if letter_div else f"Block {len(groups)+1}"

        group_header = section.find_previous("div", class_="groupHeader")
        block_number = group_header.find("h2", class_="groupNumber").get_text(strip=True) if group_header else f"{len(groups)+1}"
        instructions_tag = group_header.select_one(".instructionsHeader h3") if group_header else None
        instructions_text = instructions_tag.get_text(strip=True) if instructions_tag else ""

        group_conjunction_tag = group_header.find_next_sibling("div", class_="templatesConjunctionRow") if group_header else None
        group_type = ""
        if re.search(r"Complete\s*(A|A,|A,B|A,B,)\s*or\s*C", instructions_text, re.IGNORECASE):
            group_type = group_conjunction_tag.get_text(strip=True).upper() if group_conjunction_tag else "OR"

        attributes_tag = group_header.select_one(".attributeContent .attributeContainer") if group_header else None
        attribute_text = attributes_tag.get_text(strip=True) if attributes_tag else ""

        current_group = {
            "label": label,
            "block_number": block_number,
            "instructions": instructions_text,
            "attribute": attribute_text,
            "group_type": group_type,
            "courses": []
        }

        for artic_row in section.select(".articRow"):
            sending = artic_row.find("div", class_="rowSending")
            receiving = artic_row.find("div", class_="rowReceiving")

            def safe_extract_text(parent, class_name):
                tag = parent.find('div', class_=class_name) if parent else None
                return tag.get_text(strip=True) if tag else ""

            receiving_course = {
                'prefix': safe_extract_text(receiving, 'prefixCourseNumber'),
                'title': safe_extract_text(receiving, 'courseTitle'),
                'units': safe_extract_text(receiving, 'courseUnits')
            }

            if sending and "No Course Articulated" not in sending.get_text():
                sending_courses = extract_sending_courses(sending)
                status = "articulated" if sending_courses else "not_articulated"
            else:
                sending_courses = None
                status = "never_articulated" if "Never Articulated" in receiving.get_text() else "not_articulated"

            current_group["courses"].append({
                "receiving_course": receiving_course,
                "sending_courses": sending_courses,
                "status": status
            })

        groups.append((area_title, current_group))

    grouped_by_area = {}
    for area_title, group in groups:
        grouped_by_area.setdefault(area_title, []).append(group)

    return {
        "major_title": major_title,
        "sending_school": sending_school,
        "receiving_school": receiving_school,
        "options": grouped_by_area
    }

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).replace(" ", "_").lower()

def save_to_json(data, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    filename = sanitize_filename(data["major_title"]) + ".json"
    filepath = os.path.join(output_folder, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {filepath}")

def scrape_all_majors(transfer_id, ccc_id, transfer_name, ccc_name):
    output_folder = f"assistdata/{sanitize_filename(transfer_name)}/{sanitize_filename(ccc_name)}"
    url = f"https://www.assist.org/transfer/results/preview?year=75&institution={ccc_id}&agreement={transfer_id}&agreementType=to&viewAgreementsOptions=true&view=agreement&viewBy=major&viewSendingAgreements=false&viewByKey=75%2F{ccc_id}%2Fto%2F{transfer_id}%2FAllMajors"

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    service = Service("/Users/htet/Downloads/chromedriver-mac-arm64/chromedriver")
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        print(f"\nScraping: {ccc_name} → {transfer_name}")
        driver.get(url)
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, "articRow")))

        soup = BeautifulSoup(driver.page_source, "html.parser")
        sending_school = soup.find("div", class_="instSending").find("b").get_text(strip=True).replace("From: ", "")
        receiving_school = soup.find("div", class_="instReceiving").find("b").get_text(strip=True).replace("To: ", "")

        major_tags = soup.find_all("h2", class_="agreementTitle")
        print(f"🔍 Found {len(major_tags)} majors for {ccc_name} → {transfer_name}")

        for tag in major_tags:
            siblings = []
            for sib in tag.find_next_siblings():
                if sib.name == "h2" and "agreementTitle" in sib.get("class", []):
                    break
                siblings.append(sib)

            parsed = parse_major_block(tag, siblings, sending_school, receiving_school)
            save_to_json(parsed, output_folder)

    except Exception as e:
        print(f"Error during scrape: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    for transfer in transfer_schools:
        for ccc in ccc_schools:
            scrape_all_majors(
                transfer_id=transfer["id"],
                ccc_id=ccc["id"],
                transfer_name=transfer["name"],
                ccc_name=ccc["name"]
            )
