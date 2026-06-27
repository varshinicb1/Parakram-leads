"""LinkedIn messenger using Playwright browser automation."""

import asyncio
import logging
import random
from typing import Optional

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from app.config import settings

logger = logging.getLogger(__name__)


class LinkedInMessenger:
    """Automates LinkedIn messaging via Playwright browser automation.

    Provides login, message sending, and cleanup for a headless Chromium
    session authenticated against LinkedIn.
    """

    def __init__(self) -> None:
        self._email: str = settings.LINKEDIN_EMAIL
        self._password: str = settings.LINKEDIN_PASSWORD
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

    async def _ensure_browser(self) -> Page:
        """Launch browser and return the active page, creating one if needed."""
        if self._page is not None:
            return self._page
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)
        self._context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        self._page = await self._context.new_page()
        return self._page

    async def login(self) -> bool:
        """Log in to LinkedIn using stored credentials.

        Returns:
            True if login succeeded and the feed page was reached, False
            otherwise (including when 2FA is detected).
        """
        try:
            page = await self._ensure_browser()
            logger.info("Navigating to LinkedIn login page")
            await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")

            # Fill credentials
            await page.fill("#username", self._email)
            await page.fill("#password", self._password)

            # Click sign-in button
            await page.click('button[type="submit"]')
            await page.wait_for_load_state("domcontentloaded")

            # Small delay to allow redirect
            await asyncio.sleep(3)

            # Check for 2FA / challenge page
            current_url = page.url
            if "checkpoint" in current_url or "challenge" in current_url:
                logger.warning(
                    "LinkedIn 2FA or security challenge detected — manual intervention required"
                )
                return False

            # Check if we reached the feed (successful login)
            if "feed" in current_url or "mynetwork" in current_url or current_url.rstrip("/") == "https://www.linkedin.com":
                logger.info("LinkedIn login successful")
                return True

            logger.warning("LinkedIn login uncertain — current URL: %s", current_url)
            return False

        except Exception as e:
            logger.error("LinkedIn login failed: %s", e)
            return False

    async def send_message(self, profile_url: str, message_text: str) -> bool:
        """Send a message to a LinkedIn profile.

        Args:
            profile_url: Full URL of the LinkedIn profile to message.
            message_text: The message body to send.

        Returns:
            True if the message was sent successfully, False otherwise.
        """
        try:
            page = await self._ensure_browser()

            # Navigate to the profile
            logger.info("Navigating to LinkedIn profile: %s", profile_url)
            await page.goto(profile_url, wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(2, 5))

            # Click the "Message" button
            try:
                message_button = page.locator(
                    'button:has-text("Message"), '
                    'button[aria-label*="Message"], '
                    '.msg-form__message-texteditor'
                ).first
                await message_button.click(timeout=10000)
            except Exception:
                logger.error("Message button not found on profile: %s", profile_url)
                return False

            # Wait for the message dialog / composer to appear
            await asyncio.sleep(random.uniform(1, 2))

            try:
                # Try the newer LinkedIn message editor
                editor = page.locator(
                    '.msg-form__contenteditable, '
                    '[contenteditable="true"], '
                    '.msg-form__message-texteditor'
                ).first
                await editor.wait_for(state="visible", timeout=10000)

                # Type message with realistic human-like delays
                await editor.click()
                for char in message_text:
                    await editor.type(char, delay=random.randint(30, 100))
                    # Occasional micro-pause to mimic human behaviour
                    if random.random() < 0.05:
                        await asyncio.sleep(random.uniform(0.1, 0.4))

            except Exception:
                logger.error("Message editor not available for profile: %s", profile_url)
                return False

            # Small pause before sending
            await asyncio.sleep(random.uniform(0.5, 1.5))

            # Click the send button
            try:
                send_button = page.locator(
                    'button.msg-form__send-button, '
                    'button[aria-label="Send"], '
                    'button:has-text("Send")'
                ).first
                await send_button.click(timeout=10000)
            except Exception:
                logger.error("Send button not found for profile: %s", profile_url)
                return False

            await asyncio.sleep(1)
            logger.info("LinkedIn message sent to %s", profile_url)
            return True

        except Exception as e:
            logger.error("LinkedIn send_message failed for %s: %s", profile_url, e)
            return False

    async def close(self) -> None:
        """Close browser context and Playwright instance."""
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
            logger.info("LinkedIn browser session closed")
        except Exception as e:
            logger.error("Error closing LinkedIn browser: %s", e)
        finally:
            self._page = None
            self._context = None
            self._browser = None
            self._playwright = None
