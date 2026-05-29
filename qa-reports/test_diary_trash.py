"""QA Test: Diary right-click menu + recycle bin"""
import os
from playwright.sync_api import sync_playwright

QA_DIR = "/root/mind-land/qa-reports"

def screenshot(page, name):
    path = os.path.join(QA_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  [SCREENSHOT] {name}")

def wait_stable(page, ms=800):
    page.wait_for_timeout(ms)

def click_context_menu_item(page, label):
    """Click a context menu item by dispatching a direct click event,
    bypassing the document mousedown listener that closes the menu prematurely."""
    result = page.evaluate("""(label) => {
        const buttons = document.querySelectorAll('div.fixed.z-50 button');
        for (const btn of buttons) {
            if (btn.textContent === label) {
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
        }
        return false;
    }""", label)
    return result

def click_confirm_button(page, label):
    """Click a button in the confirm dialog, if present."""
    return page.evaluate("""(label) => {
        // Search for buttons in fixed modals/overlays
        const allBtns = document.querySelectorAll('button');
        for (const btn of allBtns) {
            if (btn.textContent.trim() === label) {
                // Skip if parent is not visible (not in a visible dialog)
                let el = btn;
                while (el) {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') break;
                    if (el.getAttribute('role') === 'alertdialog') {
                        btn.click();
                        return true;
                    }
                    if (el.classList.contains('fixed') && el.classList.contains('z-50')) {
                        btn.click();
                        return true;
                    }
                    el = el.parentElement;
                }
                // Fallback: just click it
                btn.click();
                return true;
            }
        }
        return false;
    }""", label)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN"
        )
        page = context.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        # =====================================================
        # STEP 1: Open diary page
        # =====================================================
        print("=== STEP 1: Open diary page ===")
        page.goto("http://localhost:3000/diary")
        page.wait_for_load_state("networkidle")
        wait_stable(page, 1500)
        screenshot(page, "01_diary_page")

        cards = page.locator("div.cursor-pointer.select-none")
        card_count = cards.count()
        print(f"  Diary cards: {card_count}")

        if card_count == 0:
            print("  ERROR: No diary cards found!")
            browser.close()
            return

        # =====================================================
        # STEP 2: Right-click first card → context menu
        # =====================================================
        print("=== STEP 2: Right-click first card → context menu ===")
        first_card = cards.first
        bbox = first_card.bounding_box()
        page.mouse.click(bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2, button="right")
        wait_stable(page, 600)
        screenshot(page, "02_context_menu")

        menu_btns = page.locator("div.fixed.z-50 button")
        print(f"  Menu items: {menu_btns.count()}")
        for i in range(menu_btns.count()):
            try:
                print(f"    [{i}] '{menu_btns.nth(i).inner_text()}'")
            except:
                pass

        # =====================================================
        # STEP 3: Click "删除" → confirm dialog
        # =====================================================
        print("=== STEP 3: Click '删除' ===")
        ok = click_context_menu_item(page, "删除")
        print(f"  Dispatch result: {ok}")
        wait_stable(page, 1000)
        screenshot(page, "03_confirm_dialog")

        # Check for confirm dialog using DOM inspection
        has_dialog = page.evaluate("""() => {
            return !!document.querySelector('[role="alertdialog"]') ||
                   !!document.querySelector('div[class*="fixed"][class*="z-50"] button');
        }""")
        print(f"  Confirm dialog found (DOM): {has_dialog}")

        if not has_dialog:
            wait_stable(page, 1000)
            has_dialog2 = page.evaluate("""() => {
                return !!document.querySelector('[role="alertdialog"]') ||
                       (() => {
                           const btns = document.querySelectorAll('button');
                           for (const b of btns) {
                               if (b.textContent.trim() === '删除') {
                                   let el = b;
                                   while (el) {
                                       if (el.getAttribute('role') === 'alertdialog') return true;
                                       el = el.parentElement;
                                   }
                               }
                           }
                           return false;
                       })();
            }""")
            print(f"  Confirm dialog found (retry): {has_dialog2}")
            screenshot(page, "03b_confirm_retry")

        # =====================================================
        # STEP 4: Confirm deletion
        # =====================================================
        print("=== STEP 4: Confirm delete ===")
        confirmed = click_confirm_button(page, "删除")
        print(f"  Confirm click result: {confirmed}")
        wait_stable(page, 1500)
        screenshot(page, "04_after_delete")

        # =====================================================
        # STEP 5: Enter recycle bin
        # =====================================================
        print("=== STEP 5: Click trash button → recycle bin ===")
        trash_btn = page.locator("button[title='回收站']")
        if trash_btn.count() > 0:
            trash_btn.click()
        else:
            print("  ERROR: Trash button not found!")
            browser.close()
            return
        wait_stable(page, 1500)
        screenshot(page, "05_trash_view")

        in_trash = page.locator("button[title='返回日记']").count() > 0
        trash_cards = page.locator("div.cursor-pointer.select-none")
        print(f"  In trash view: {in_trash}")
        print(f"  Trash entries: {trash_cards.count()}")

        if trash_cards.count() == 0:
            print("  WARNING: Trash is empty. Going back to delete another entry...")
            page.locator("button[title='返回日记']").click()
            wait_stable(page, 1000)
            # Delete via API to ensure we have trash
            cards2 = page.locator("div.cursor-pointer.select-none")
            if cards2.count() > 0:
                bbox = cards2.first.bounding_box()
                page.mouse.click(bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2, button="right")
                wait_stable(page, 600)
                click_context_menu_item(page, "删除")
                wait_stable(page, 1000)
                click_confirm_button(page, "删除")
                wait_stable(page, 1000)
            page.locator("button[title='回收站']").click()
            wait_stable(page, 1500)
            trash_cards = page.locator("div.cursor-pointer.select-none")
            print(f"  After re-delete, trash entries: {trash_cards.count()}")

        if trash_cards.count() == 0:
            print("  ERROR: Still no trash entries. Skipping sub-tests.")
        else:
            # =====================================================
            # STEP 6: Right-click trash entry
            # =====================================================
            print("=== STEP 6: Right-click trash entry → context menu ===")
            bbox = trash_cards.first.bounding_box()
            page.mouse.click(bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2, button="right")
            wait_stable(page, 600)
            trash_menu = page.locator("div.fixed.z-50 button")
            print(f"  Trash context menu items: {trash_menu.count()}")
            for i in range(trash_menu.count()):
                try:
                    print(f"    [{i}] '{trash_menu.nth(i).inner_text()}'")
                except:
                    pass
            screenshot(page, "06_trash_context_menu")

            # =====================================================
            # STEP 7: Click "恢复"
            # =====================================================
            print("=== STEP 7: Click '恢复' ===")
            restored = click_context_menu_item(page, "恢复")
            print(f"  Restore click: {restored}")
            wait_stable(page, 1000)
            screenshot(page, "07_after_restore")

            # Go back to normal view to verify
            if page.locator("button[title='返回日记']").count() > 0:
                page.locator("button[title='返回日记']").click()
                wait_stable(page, 800)
            normal_cards = page.locator("div.cursor-pointer.select-none")
            print(f"  Cards in normal view after restore: {normal_cards.count()}")
            screenshot(page, "07b_normal_after_restore")

            # =====================================================
            # STEP 8: Delete → re-enter trash → permanent delete
            # =====================================================
            print("=== STEP 8: Permanent delete test ===")
            if normal_cards.count() > 0:
                bbox = normal_cards.first.bounding_box()
                page.mouse.click(bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2, button="right")
                wait_stable(page, 600)
                click_context_menu_item(page, "删除")
                wait_stable(page, 1000)
                click_confirm_button(page, "删除")
                wait_stable(page, 1000)

            page.locator("button[title='回收站']").click()
            wait_stable(page, 1000)

            trash_cards2 = page.locator("div.cursor-pointer.select-none")
            if trash_cards2.count() > 0:
                bbox = trash_cards2.first.bounding_box()
                page.mouse.click(bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2, button="right")
                wait_stable(page, 600)
                click_context_menu_item(page, "彻底删除")
                wait_stable(page, 1000)
                screenshot(page, "08_permanent_delete_confirm")
                click_confirm_button(page, "删除")  # confirm "彻底删除" dialog uses "删除" as confirm text
                wait_stable(page, 1000)
                print("  Permanent delete executed")
            screenshot(page, "08b_after_permanent_delete")

        # =====================================================
        # STEP 9: Empty trash
        # =====================================================
        print("=== STEP 9: Empty trash ===")
        empty_btn = page.locator("button[title='清空回收站']")
        if empty_btn.count() > 0:
            remaining = page.locator("div.cursor-pointer.select-none").count()
            print(f"  Remaining entries: {remaining}")
            if remaining > 0:
                empty_btn.click()
                wait_stable(page, 1000)
                screenshot(page, "09_empty_trash_confirm")
                click_confirm_button(page, "清空")
                wait_stable(page, 1000)
                print("  Trash emptied")
        screenshot(page, "09_after_empty_trash")

        # =====================================================
        # FINAL
        # =====================================================
        print("=== FINAL ===")
        if page.locator("button[title='返回日记']").count() > 0:
            page.locator("button[title='返回日记']").click()
            wait_stable(page, 800)
        screenshot(page, "99_final")

        if errors:
            print(f"  Console errors: {errors}")
        print("\n=== TEST COMPLETE ===")
        browser.close()

if __name__ == "__main__":
    run()
