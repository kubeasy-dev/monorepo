from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating to challenges list...")
        page.goto('https://kubeasy.dev/challenges')
        page.wait_for_load_state('networkidle')
        
        # Look for specific challenge links (usually /challenges/some-slug)
        links = page.locator('a').all()
        # Filter links that are strictly under /challenges/ and not just /challenges
        challenge_links = [l for l in links if l.get_attribute('href') and '/challenges/' in l.get_attribute('href') and len(l.get_attribute('href').strip('/')) > len('challenges')]
        
        if not challenge_links:
            # Try finding any link inside a card or list
            challenge_links = page.locator('main a').all()

        if challenge_links:
            # Pick one that isn't the current page if possible
            target = challenge_links[0]
            for l in challenge_links:
                if l.get_attribute('href') != '/challenges' and l.get_attribute('href') != '/challenges/':
                    target = l
                    break
                    
            href = target.get_attribute('href')
            print(f"Clicking on specific challenge: {href}")
            target.click()
            page.wait_for_load_state('networkidle')
            print(f"Now on: {page.url}")
            page.screenshot(path='challenge_final.png')
        else:
            print("No specific challenge links found.")

        browser.close()

if __name__ == '__main__':
    run()
