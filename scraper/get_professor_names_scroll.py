import os

os.makedirs("ScrapedData", exist_ok=True)

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def setup_driver():
    options = Options()
    options.add_argument('--start-maximized')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    return webdriver.Chrome(options=options)

def close_ads(driver):
    try:
        ads = driver.find_elements(By.CSS_SELECTOR, 'div[class*="close"], button[class*="close"]')
        for ad in ads:
            try:
                ad.click()
                print("Closed ad")
            except:
                continue
    except:
        pass

def get_professor_names_scroll():
    driver = setup_driver()
    # Change school id below
    # 1886 for csm, 2811 for skyline, 1796 for canada college
    SCHOOL_ID = "1886"
    driver.get(f"https://www.ratemyprofessors.com/search/professors/{SCHOOL_ID}?q=")

    time.sleep(5)

    while True:
        close_ads(driver)

        try:
            wrapper = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CLASS_NAME, "SearchResultsPage__AddPromptWrapper-vhbycj-3"))
            )
            show_more = wrapper.find_element(By.XPATH, ".//button[contains(text(), 'Show More')]")
            print("Found Show More button")

            # Scroll into view and wait for clickability
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", show_more)
            WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, ".//button[contains(text(), 'Show More')]")))
            
            # Click and confirm
            show_more.click()
            print("Clicked 'Show More'")
            time.sleep(2.5)

        except Exception as e:
            print("No more 'Show More' button found.")
            break

    # Extract names
    try:
        cards = driver.find_elements(By.CSS_SELECTOR, "a[class*='TeacherCard__StyledTeacherCard']")
        seen = set()

        # Change the school name to create different txt files
        with open("ScrapedData/professors_School.txt", "w", encoding="utf-8") as f:
            for card in cards:
                try:
                    name_elem = card.find_element(By.CSS_SELECTOR, "div[class*='CardName__StyledCardName']")
                    name = name_elem.text.strip()
                    if name and name not in seen:
                        seen.add(name)
                        f.write(name + "\n")
                        print(f"Saved: {name}")
                except Exception as e:
                    print(f"Skipped card: {e}")

        print(f"\n Done! Total professors saved: {len(seen)} to professors.txt")
    except Exception as e:
        print(f"Error during name extraction: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    get_professor_names_scroll()
