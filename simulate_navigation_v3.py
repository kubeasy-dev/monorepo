from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating to challenges list...")
        try:
            page.goto('https://kubeasy.dev/challenges', timeout=60000)
            page.wait_for_load_state('domcontentloaded')
            # Small extra wait for JS to render components
            time.sleep(5)
            
            print(f"Page title: {page.title()}")
            
            # Find challenge links
            links = page.locator('a').all()
            print(f"Found {len(links)} links on the page.")
            
            valid_challenges = []
            for l in links:
                href = l.get_attribute('href')
                if href and '/challenges/' in href and len(href.strip('/')) > len('challenges'):
                    valid_challenges.append(l)
            
            if valid_challenges:
                target = valid_challenges[0]
                href = target.get_attribute('href')
                text = target.inner_text()
                print(f"Clicking on: {text} ({href})")
                target.click()
                page.wait_for_load_state('domcontentloaded')
                time.sleep(3)
                print(f"Successfully navigated to: {page.url}")
            else:
                print("No specific challenge links found. Listing first 10 links for debugging:")
                for i, l in enumerate(links[:10]):
                    print(f"Link {i}: {l.inner_text()} -> {l.get_attribute('href')}")
                    
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()

if __name__ == '__main__':
    run()
