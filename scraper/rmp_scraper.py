import os

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from urllib.parse import quote
import json

os.makedirs("ScrapedData", exist_ok=True)

def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--ignore-certificate-errors')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1280, 800)
    return driver

def extract_card_data(card):
    try:
        name = card.find_element(By.CSS_SELECTOR, "div[class*='CardName']").text.strip()
        name_parts = name.split()
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        department = card.find_element(By.CSS_SELECTOR, "div[class*='CardSchool__Department']").text.strip()
        school_name = card.find_element(By.CSS_SELECTOR, "div[class*='CardSchool__School']").text.strip()

        rating = float(card.find_element(By.CSS_SELECTOR, "div[class*='CardNumRating__CardNumRatingNumber']").text.strip())
        num_ratings = int(card.find_element(By.CSS_SELECTOR, "div[class*='CardNumRating__CardNumRatingCount']").text.strip().split()[0])
        would_take = float(card.find_elements(By.CSS_SELECTOR, "div[class*='CardFeedback__CardFeedbackNumber']")[0].text.strip().replace('%', ''))
        difficulty = float(card.find_elements(By.CSS_SELECTOR, "div[class*='CardFeedback__CardFeedbackNumber']")[1].text.strip())

        profile_url = card.get_attribute("href")
        if not profile_url.startswith("http"):
            profile_url = "https://www.ratemyprofessors.com" + profile_url

        return {
            "firstName": first_name,
            "lastName": last_name,
            "avgRating": rating,
            "numRatings": num_ratings,
            "avgDifficulty": difficulty,
            "wouldTakeAgainPercent": would_take,
            "department": department,
            "school": {
                "name": school_name,
                "id": "2811"
            },
            "profileUrl": profile_url
        }

    except Exception as e:
        print(f"Failed to extract card data: {e}")
        return None

def search_professor(driver, professor_name):
    # Change school id below
    # 1886 for csm, 2811 for skyline, 1796 for canada college
    SCHOOL_ID = "1886"
    search_url = f"https://www.ratemyprofessors.com/search/professors/{SCHOOL_ID}?q={quote(professor_name)}"
    print(f"\n Searching for: {professor_name}")
    print(f"URL: {search_url}")
    driver.get(search_url)

    try:
        card = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a[class*='TeacherCard__StyledTeacherCard']"))
        )
        return extract_card_data(card)

    except Exception as e:
        print(f"Failed to scrape '{professor_name}': {e}")
        driver.save_screenshot(f"screenshot_{professor_name.replace(' ', '_')}.png")
        return None

def main():
    driver = setup_driver()
    all_data = []
    
    # Change the school name to get access to the teachers names
    with open("Scraped_Data/professors_CSM.txt", "r", encoding="utf-8") as f:
        names = [line.strip() for line in f if line.strip()]

    try:
        for name in names:
            data = search_professor(driver, name)
            if data:
                all_data.append(data)
    finally:
        driver.quit()

    if all_data:
        # Correspond the above school name next to professors with _ to create json data files
        with open("ScrapedData/all_professors.json", "w", encoding="utf-8") as f:
            json.dump(all_data, f, indent=2)
            print(f"\nSaved {len(all_data)} professors to all_professors.json")
    else:
        print("No data scraped.")

if __name__ == "__main__":
    main()
