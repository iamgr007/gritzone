# 💰 GRITZONE Pricing & Unit Economics

**Last updated:** 21 April 2026
**Status:** Beta — Prices not yet live

---

## 1. Cost Analysis

### 1.1 Google Gemini API (AI Food Scanner)

Using `gemini-2.5-flash` (current rates as of Apr 2026):

| Component | Rate |
|---|---|
| Input tokens (text + image) | **$0.30 per 1M tokens** |
| Output tokens | **$2.50 per 1M tokens** |
| Image "cost" | ~258–1290 tokens per image (varies by resolution) |

**Per-scan estimate:**

| Item | Tokens | Cost |
|---|---|---|
| Image (768×768, compressed to ~300KB) | ~1,000 input | $0.00030 |
| System prompt + user prompt | ~500 input | $0.00015 |
| JSON output (3-5 items, ~400 chars) | ~500 output | $0.00125 |
| **Total per scan** | | **≈ $0.0017** (₹0.14) |

**Per-user Gemini cost (by usage intensity):**

| Scenario | Scans/day | Monthly scans | Monthly cost |
|---|---|---|---|
| Casual | 2 | 60 | ₹8.40 ($0.10) |
| Normal | 5 | 150 | ₹21 ($0.25) |
| Heavy | 10 | 300 | ₹42 ($0.51) |
| Power user | 20 | 600 | ₹84 ($1.01) |

> **Key insight:** Even a power user costs only ₹84/month in Gemini fees. Pro Max at ₹399 has a **4.8× margin over AI cost alone** at the heaviest realistic usage.

**Abuse protection:** rate-limit to **25 scans/day per user** (via row in `ai_usage_log` table). Prevents rogue automation from burning the budget. Normal users never hit this.

---

### 1.2 Supabase (Database + Auth + Storage)

| Tier | Users supported | DB | Egress | Storage | Cost |
|---|---|---|---|---|---|
| Free | ~500 | 500 MB | 5 GB | 1 GB | $0 |
| Pro | ~10,000 | 8 GB | 250 GB | 100 GB | $25/mo |
| Team | ~50,000 | 100 GB | 1 TB | 1 TB | $599/mo |

**Per-user data estimate (1 year active):**
- Check-ins: 365 rows × ~200 bytes = 73 KB
- Food logs: ~1,500 rows × 150 bytes = 225 KB
- Workouts + sets: ~200 × ~500 bytes = 100 KB
- Photos (profile + workout pics): ~5 MB
- **Total per user/year: ~5.5 MB**

**10,000 users = 55 GB** → fits Supabase Pro ($25/mo = ₹2,100). That's **₹0.21 per user/mo**.

---

### 1.3 Vercel (Web Hosting + API Routes)

| Tier | Requests | Bandwidth | Cost |
|---|---|---|---|
| Hobby | 100k/mo | 100 GB | $0 |
| Pro | 1M/mo | 1 TB | $20/mo |
| Enterprise | Custom | Custom | $500+/mo |

**Estimate:** Average user = ~50 API calls/day × 30 = 1,500/mo. 10k users = 15M requests/mo.

**Need:** Vercel Pro + overages OR migrate to AWS/GCP (~$50-100/mo at 10k users).

**Budget allocation:** $100/mo = ₹8,400 for hosting at 10k users = **₹0.84/user**.

---

### 1.4 PayU Transaction Fees

| Method | Fee |
|---|---|
| UPI | **0%** (until Dec 2026 per govt subsidy) |
| Credit/debit card | 2% |
| Net banking | 1.5% |
| International card | 3.5% |

**Weighted avg (India user mix):** UPI 60%, card 30%, netbanking 10% = **~0.75% average**

On ₹199 sub: ~₹1.50 processing fee. On ₹1,299 annual: ~₹9.75.

---

### 1.5 Other Recurring

| Item | Cost |
|---|---|
| Domain (gritzone.me) | ₹1,000/year (₹83/mo) |
| Email (support@gritzone.me via Zoho Mail) | ₹120/user/mo (1 account) |
| SSL certs | Free (Vercel/Let's Encrypt) |
| Apple Developer | $99/year = ₹8,250 (₹690/mo) |
| Google Play Console | $25 one-time |
| **Fixed monthly (independent of users)** | **~₹900/mo** |

---

## 2. Total Cost Per User (Monthly)

### Free User
| Item | Cost |
|---|---|
| Supabase share | ₹0.21 |
| Vercel share | ₹0.84 |
| Fixed overhead share (1000 users) | ₹0.90 |
| AI scanner | ₹0 (not enabled for Free) |
| **Total cost** | **₹1.95/user** |

### Pro User (no AI)
Same as Free = **~₹2/user/mo**. Revenue ₹199 → **Margin 99%**.

### Pro Max User (heavy AI usage: 10 scans/day)
| Item | Cost |
|---|---|
| Supabase + Vercel + fixed | ₹2 |
| Gemini (10 scans/day) | ₹42 |
| PayU fee (0.75% of ₹399) | ₹3 |
| **Total cost** | **₹47** |

Revenue ₹399 → **Margin 88% (₹352 profit/user/mo)**

---

## 3. Recommended Pricing

### Final Plan Structure

| Plan | Monthly | Yearly (40% off) | AI Scans/day | Target persona |
|---|---|---|---|---|
| **Free** | ₹0 | ₹0 | 0 | Casual / student |
| **Pro** | ₹199 | ₹1,299 (₹108/mo) | 3 | Serious lifter |
| **Pro Max** | ₹399 | ₹2,499 (₹208/mo) | 25 | Biohacker / coach |
| **Coach** *(future)* | ₹999 | ₹8,499 (₹708/mo) | Unlimited | Trainers w/ clients |

### Rationale for each price

- **₹199 Pro**: matches gym monthly fee psychology (₹500-2000/mo). At ~₹7/day, cheaper than a chai. Unlocks everything except AI scans.
- **₹399 Pro Max**: AI is the moat. Competitors (Healthify Snap) charge ₹500+/mo. Priced under for acquisition.
- **Annual discounts (-40%)**: industry norm is -20%, we go aggressive to boost LTV and reduce churn. Users who pay yearly have 4× better retention.

### Pricing Tier Justification (psychological)

Avoid ₹299 and ₹499 — "double nine" (₹199/₹399) feels sharper and under threshold. **₹399 is below ₹400** = still "three hundred" in user mental accounting.

---

## 4. Revenue Projections

### Conservative Beta → Launch Scenarios

Assumes free-to-paid conversion rates:

| Users | Free% | Pro% | ProMax% | MRR |
|---|---|---|---|---|
| 1,000 | 92% | 6% | 2% | ₹19,940 |
| 10,000 | 90% | 7% | 3% | ₹2,59,700 |
| 100,000 | 88% | 8% | 4% | ₹31,52,000 |

**Target: 10k users by Oct 2026** → **₹2.6L/mo MRR ≈ ₹31L ARR**

Costs at 10k users: ₹20k/mo. **Gross margin: ~92%.** Healthy SaaS.

---

## 5. Upsell Levers

Beyond the 3-tier base:

1. **Coach Mode (₹999/mo)** — Trainers manage 10 clients, see their logs, push programs. Launch Q3.
2. **Family Plan (₹699/mo)** — 4 Pro accounts. ₹175/each vs ₹199 standalone.
3. **Lifetime Pro Max (₹7,999 one-time)** — for early adopters. Limited to first 500 buyers. Creates urgency + immediate cash flow.
4. **Corporate wellness (₹149/employee/mo, min 50 seats)** — companies buy for employees. 100 employees × ₹149 = ₹14,900/mo × 10 companies = ₹1.5L/mo.

---

## 6. Unit Economics (ProMax user)

| Metric | Value |
|---|---|
| ARPU (Pro Max monthly) | ₹399 |
| Cost per user | ₹47 |
| Gross margin | ₹352 (88%) |
| Avg subscription life | 8 months (estimated) |
| LTV | ₹2,816 |
| Target CAC | < ₹300 (10% of LTV) |
| Payback period | 0.85 month |

If CAC stays < ₹300 via organic + influencer + referral, every rupee spent on marketing returns **9× in LTV**.

---

## 7. What I'd Change Later

- **After 1,000 paid users**: A/B test ₹249 vs ₹199 for Pro. Likely small churn for 25% revenue lift.
- **At 5,000 users**: Add **per-scan credits** as a cheaper Pro option (₹99 + ₹2/scan) — captures price-sensitive users who don't scan daily.
- **International**: USD pricing for diaspora/US users — Pro $4.99, Pro Max $9.99. 4-5× price of INR. Use Stripe.
- **Corporate wellness**: B2B deals close slower but check sizes are 10-100× bigger.

---

## 8. Price-Change Policy

- Current users are **grandfathered** at signup price for life (or 1 year for annual) — reduces churn when we raise prices.
- Price changes announced with **30 days notice** via email + in-app banner.
- Never raise price within 6 months of signup.

---

*This doc is internal. Don't publish the cost analysis publicly.*
