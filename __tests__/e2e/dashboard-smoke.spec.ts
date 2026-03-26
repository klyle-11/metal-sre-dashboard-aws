import { test, expect } from '@playwright/test';

test('dashboard loads and shows a page title', async ({ page }) =>
    {
        await page.goto('/');
        await expect(page).toHaveTitle(/METAL|SRE|Dashboard/i);
    }
);


//later test for loading skeleton