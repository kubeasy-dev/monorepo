from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating to challenges list...")
        page.goto('https://kubeasy.dev/challenges')
        page.wait_for_load_state('networkidle')
        
        # Take a screenshot to see what's on the page
        page.screenshot(path='challenges_list.png')
        print("Screenshot of challenges list saved.")
        
        # Look for challenge links. Assuming they might be under /challenges/
        # Let's list all links to be sure
        links = page.locator('a').all()
        challenge_links = [l for l in links if '/challenges/' in l.get_attribute('href') or 'challenge' in l.get_attribute('href').lower()]
        
        if challenge_links:
            target = challenge_links[0]
            href = target.get_attribute('href')
            print(f"Clicking on challenge: {href}")
            target.click()
            page.wait_for_load_state('networkidle')
            page.screenshot(path='challenge_detail.png')
            print(f"Screenshot of challenge detail saved.")
        else:
            print("No specific challenge links found, looking for any content link...")
            # Fallback: just click the first link that looks like a challenge if any
            first_link = page.locator('main a, .content a').first
            if first_link.count() > 0:
                print(f"Clicking first content link...")
                first_link.click()
                page.wait_for_load_state('networkidle')
                page.screenshot(path='challenge_fallback.png')
            else:
                print("No links found to click.")

        browser.close()

if __name__ == '__main__':
    run()
