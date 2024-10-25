import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

test.describe("Login", () => {
  test.afterEach(async ({ page }) => {
    // await page.evaluate(() => {
    //   // Assuming there's a global function to clean up user
    //   window.cleanupUser();
    // });
  });

  test.only("should allow you to register and login", async ({ page }) => {
    const loginForm = {
      email: `${faker.internet.userName()}@example.com`,
      password: faker.internet.password(),
    };

    const hash = await bcrypt.hash(process.env.USER_SECRET!, 10);

    await page.goto(`/join?token=${encodeURIComponent(hash)}`);
    await page.waitForTimeout(1000);

    await page.fill('input[name="email"]', loginForm.email);
    await page.fill('input[name="password"]', loginForm.password);
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });
});
