# Browser-Agent Prompts (Claude for Chrome)

Tasks that require a logged-in browser session (AWS console / Etsy UI) — things the
API/CLI can't do. Paste one prompt at a time into Claude for Chrome on the machine where
you're logged into the relevant account. Each prompt is self-contained.

Account context: AWS account `291911889079`, EC2 instance `i-0dfddb55abbf931d1`
(region ap-southeast-2). Etsy shop **TheMappedMoment** (shop id 12648302).

---

## PROMPT 1 — Fix the Bedrock IAM policy (unblocks the AI order-recovery) ⭐ do first

> You are operating my AWS console (I'm logged in). Goal: let my EC2 instance role call
> Claude 3 Haiku on Bedrock. Steps:
> 1. Go to **IAM → Roles** and open the role **EC2BedrockRole**.
> 2. Under **Permissions**, find the inline policy (named **BedrockInvokeModelPolicy**) and
>    click it → **Edit** → switch to the **JSON** tab.
> 3. Replace the entire JSON with exactly this, then **Save**:
> ```json
> {
>   "Version": "2012-10-17",
>   "Statement": [
>     {
>       "Effect": "Allow",
>       "Action": "bedrock:InvokeModel",
>       "Resource": "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3*"
>     }
>   ]
> }
> ```
> 4. Confirm the saved policy shows the new Resource ending in `anthropic.claude-3*`.
> Report back the final Resource string and confirm there were 0 errors/warnings.

---

## PROMPT 2 — Etsy: Shop Announcement (shop-wide copy)

> You are operating my Etsy Shop Manager (I'm logged into TheMappedMoment). Goal: set the
> Shop Announcement. Go to **Settings → Info & Appearance**, find **Shop Announcement**, and
> set it to exactly:
>
> "✦ Free US shipping on every print, beautifully made to order. Need it for a date? You get
> the instant digital file right away — the print follows by mail. Personalised star & street
> map posters, shipping to the US, UK, EU, Canada & Australia. Lost or damaged in transit? We
> replace it free. 💛"
>
> Save and confirm it shows on the shop homepage. Report done.

---

## PROMPT 3 — Etsy: set up ONE listing (variations, prices, policy, partner, description)

> You are operating my Etsy Shop Manager (logged into TheMappedMoment). Goal: configure the
> listing I have open (a personalised map poster) with product variations, prices, and policies.
> Do NOT delete anything; read the current state first and report it, then make these changes:
>
> **Variations (2 types):**
> - Variation 1 = **Product Type**: Digital File · Printed Poster · Framed Print (Black) · Framed Print (White)
> - Variation 2 = **Size**: 8x10, 11x14, 12x16, 16x20, 18x24, 24x36, A1, A2, A3, A4, 5x7, A5
> - Enable "prices vary by variation".
>
> **Prices (USD, US free shipping is included in the price):**
> | Size | Digital File | Printed Poster | Framed (Black & White, same price) |
> |------|------|------|------|
> | 5x7  | 3.50 | 21.00 | 69.00 |
> | 8x10 | 3.50 | 21.00 | 74.00 |
> | A5   | 3.50 | 22.50 | 74.00 |
> | A4   | 3.50 | 21.00 | 74.00 |
> | 11x14| 4.50 | 22.50 | 78.00 |
> | 12x16| 4.50 | 23.50 | 90.00 |
> | 16x20| 4.50 | 24.50 | 98.00 |
> | A3   | 4.50 | 23.50 | 95.00 |
> | A2   | 4.50 | 26.00 | 105.00 |
> | 18x24| 5.50 | 26.00 | 105.00 |
> | A1   | 5.50 | 36.50 | 140.00 |
> | 24x36| 5.50 | 40.00 | 130.00 |
> (Digital has no shipping. For Framed Black vs White use the same price per size.)
>
> **Other settings on this listing:**
> - Mark it **Personalized** (turn on personalization; instruct buyers to paste their design code).
> - Set **Returns policy** to the "No returns or exchanges" policy.
> - Under "Who made it", add the **production partner: Prodigi** (already created in Settings →
>   Production partners) and tick it for this listing.
> - Paste the listing description from the text I provide separately (LISTING_COPY.md).
> - **Shipping:** attach a shipping profile (see note below — I may attach these via API instead).
>
> After changes, summarise exactly what you set and flag anything that didn't fit.

**Shipping-profile note:** Etsy attaches ONE profile per listing (not per size variation). We
built one profile *per size*, so per-size shipping can't be applied to a single multi-size
listing. Decide first: (a) one listing per size → precise shipping, or (b) one listing with size
variations → attach a single representative profile. Profile IDs (per size) are stored in the
server `settings` table as `shipping_profile_bap_<size>`; the agent (or the API) can attach by id.

---

## PROMPT 4 — Etsy: EU right-of-withdrawal text (if not already done)

> You are operating my Etsy Shop Manager. Go to **Settings → Policy settings → Cancellations →
> EU right of withdrawal → Add policy info**, and paste the withdrawal terms + model form from
> the text I provide (EU_WITHDRAWAL section of LISTING_COPY/notes). Also tick the box to display
> the EU Online Dispute Resolution (ODR) link. Save and confirm.

---

## Not a browser task
- **Enable AI order-recovery**: this is a server setting, not Etsy/AWS UI. Set
  `enable_order_recovery=1` (admin settings or env `ENABLE_ORDER_RECOVERY=1`) — ask the CLI agent.
- **Attach shipping profiles to listings**: can be done via the Etsy API (`updateListing` with
  `shipping_profile_id`) by the CLI agent once you decide listing structure + share listing IDs.
