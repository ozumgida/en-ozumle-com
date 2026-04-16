# LiteSite

Lite-Site is a simple, low-cost web solution that runs without requiring a server or database. It allows businesses to create a digital menu and receive orders directly via the customer's WhatsApp message.

---

## What Do You Do?

You edit the files in the `settings/` folder and run the command `bash update.sh`. This command automatically generates all HTML pages, CSS/JS files, the sitemap, SEO meta tags, and structured data (schema) markup.

1. **Business information** — `settings/company.json` contains your name, address, phone number, and social media links.

2. **Products** — The `settings/products/` folder contains one file per product. Each file defines the product name, price, description, and image. To add a new product, simply copy an existing file and modify its contents.

3. **Pages** — The `settings/pages/` folder contains pages such as privacy policy and terms of sale. To add a new page, copy an existing file and edit its content.

---

## Running with GitHub Codespaces

You don't need to install anything on your computer; everything is done in the browser.

1. On the project's GitHub page, click the green **Code** button.
2. Go to the **Codespaces** tab and click **Create codespace on main**.
3. In the editor that opens, find the `settings/` folder in the left panel and edit the files.
4. In the terminal at the bottom, type `bash update.sh` and press Enter.
5. Click the **Source Control** icon (shaped like a branch) in the left panel. You'll see the changed files. In the message box at the top, type `site updated`, then click the **Commit** button. After that, click the **Sync Changes** button to push your changes.

If GitHub Pages is enabled, your site will be updated shortly.

---

## How do campaigns work?

Please check the [docs/readme-campaign.md](campaign read me.)
