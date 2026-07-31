# DispenseRx Practice Homepage and Customer-Readiness Audit

Date: 31 July 2026

## Executive verdict

The visual foundation is good, but the website is not ready for a public paid launch yet.

It already looks cleaner than a typical unfinished beta: the hierarchy is understandable, desktop spacing is consistent, mobile has no horizontal overflow at 390px, pricing is discoverable, and the sign-up screen is usable. The remaining work is mainly customer trust, offer clarity, legal and commercial readiness, accessibility, and payment reliability—not a complete redesign.

A controlled free beta is close. Real customer payments should not be accepted until the launch blockers below are resolved.

## P0 — fix before accepting payments

### 1. Payment can succeed without access being granted

The Stripe webhook ignores database update errors, yet can still return success. Stripe may consider the event handled while the customer remains locked out. The checkout route also ignores profile lookup failures.

Required implementation:

- Validate that the customer profile exists before creating checkout.
- Check and throw on every entitlement update error.
- Record the subscription ID, selected plan, subscription status and billing period.
- Add webhook event logging and retry-safe handling.
- Test successful payment, cancellation, failed payment, webhook failure and webhook retry scenarios.

Relevant files:

- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/checkout/route.ts`

### 2. Privacy Policy and Terms are not real links

The footer displays Privacy Policy and Terms of Service as grey text rather than pages or links. The site collects names, email addresses, university and study year, and intends to collect payments.

Required implementation:

- Privacy Policy
- Terms of Service
- Refund and Cancellation Policy
- Contact and Support page
- Links to these pages from the footer, sign-up form and checkout flow

The privacy material should explain the business identity and contact details, information collected, storage, purposes, disclosures, access and correction, complaints, retention, deletion and overseas service providers. Exact legal obligations should be professionally reviewed.

### 3. No customer support route exists

Payment errors tell customers to contact support, but no email, form or help route exists.

Required implementation:

- Add a monitored support email.
- Add a contact or support page.
- Show the support route on payment failures, authentication errors and confirmation screens.
- Define who will respond and how quickly during the beta.

### 4. The commercial offer contradicts itself

The website currently uses several different descriptions:

- Navbar: “Start free trial”
- Hero: “Start Beta Practice”
- Pricing: “Free demo”
- FAQ: “Training prototype”

A permanent two-case demo is not a full-access free trial.

Recommended standard wording:

> Try 2 of 13 cases free. No card required.

Use one consistent offer across the navbar, hero, pricing, sign-up form and emails.

### 5. The hero can imply all 13 cases are free

“13 practice cases — no credit card needed” appears beneath the hero CTA, while only two cases are free.

Replace it with:

> Try 2 of 13 cases free — no card required.

### 6. Brand and learning claims are too aggressive

“Master Fred Dispense” is the dominant headline and metadata, but the FAQ says the product is not an exact replica and that many production features are absent. “Master” is also difficult to substantiate with 13 cases.

Recommended headline:

> Practise Australian dispensing workflows before placement.

“Independent Fred-style simulator” can remain a secondary descriptor after appropriate trademark and legal review. The product should not imply Fred IT affiliation or endorsement.

## P1 — required for a credible customer launch

### 1. Replace the placeholder hero visual

The hero contains a hand-built mock rather than the actual simulator. Its fictional Case 5 details also do not match the real Case 5.

Implement:

- A real, carefully cropped simulator screenshot
- A visible feedback or result state
- A second image showing counselling practice
- An optional 60–90 second product walkthrough
- Accurate and clearly fictional patient information

The current “See How It Works” button uses a play icon but only scrolls to three text steps. Either provide an actual demo or change the icon and wording to “How it works”.

### 2. Add a credibility layer before pricing

The website makes clinical-learning claims but does not explain why customers should trust the content.

Add only verifiable information:

- Who created and reviews the cases
- Reviewer qualifications, where permission is granted
- A “content reviewed on” date
- How cases are updated when guidance changes
- Clear independence from Fred IT
- What the tool assesses and does not assess
- Real student feedback after the beta produces it
- University or society pilot logos only with permission

Do not invent testimonials or institutional endorsements.

### 3. Rebuild the pricing decision

The full-access card stacks monthly and annual prices together, but customers cannot select either option. Both lead to the same sign-up route and the chosen plan is not preserved.

Implement:

- Separate monthly and annual options or use a clear billing toggle.
- Preserve the selected plan through sign-up.
- Display the annual monthly equivalent.
- State that subscriptions renew automatically.
- Explain when cancellation becomes effective.
- Clarify refunds and whether prices include GST.
- Show the payment provider and accepted payment methods.
- Explain subscription management.

The annual plan also needs a stronger ongoing benefit. Thirteen finite cases may be completed quickly. Annual access should offer new cases, case variants, progress history or a defined release cadence. Otherwise, a semester or short-access model may suit students better.

### 4. Resolve the beta-versus-paid identity

Choose one clear state:

- **Customer-ready beta:** Paid, with a defined scope, support process and known limitations.
- **Validation beta:** Free or invitation-based until payments, legal pages and content governance are complete.
- **Full launch:** Remove beta and prototype terminology once product and support readiness justify it.

Recommended approach: customer-ready beta after all P0 work is complete.

### 5. Simplify the homepage narrative

The “problem every pharmacy student faces” section overgeneralises and repeats the hero. Claims that campus software makes home study impossible may be inaccurate for some universities and could alienate future institutional partners.

Recommended homepage order:

1. Outcome-led hero
2. Real simulator preview
3. Trust and content-review strip
4. Three core learning outcomes
5. Representative case coverage
6. How practice and feedback work
7. Real student proof
8. Clear pricing
9. FAQ
10. Final CTA and support link

The current problem section should be shortened substantially or removed.

## Account and customer-flow fixes

### Sign-up

The sign-up page is visually good on desktop and mobile, but it needs:

- Terms and Privacy links beside the create-account action
- An explanation of why university and study year are collected
- Show and hide password control
- Password-manager autocomplete attributes
- Resend confirmation email control
- Change-email option on the confirmation screen
- Account deletion and data-access instructions
- Customer support link

The university list is incomplete and dated. It still contains University of South Australia and omits current providers. Use a maintained searchable list or allow clean free-text entry.

The audience statement also conflicts with the form: the FAQ targets Years 3–5 and internationally trained pharmacists, while the form offers only Years 1–4.

Recommended study-stage choices:

- Year 1
- Year 2
- Year 3
- Year 4
- Year 5+
- Postgraduate pharmacy student
- Intern pharmacist
- Internationally qualified pharmacist
- Other

### Authentication failures

The authentication callback redirects failures to `sign-in?error=auth_callback_failed`, but the sign-in page does not display that error.

Add clear customer messages for:

- Expired confirmation link
- Invalid confirmation link
- Already-used link
- Password-reset failure
- Account already registered
- Email delivery delay
- Locked or rate-limited account

## Accessibility findings

### Primary CTA contrast fails

The primary buttons render approximately as light text on `rgb(16, 183, 127)`, producing roughly 2.5:1 contrast. Normal-sized CTA text generally needs 4.5:1.

Darken the primary green or use darker text. The same issue affects the navbar CTA. Pale `text-slate-400` footer and disclaimer text is also too faint for small text.

### Form errors are not programmatically connected

After an empty sign-up submission, errors appear visually, but the inputs do not expose:

- `aria-invalid`
- `aria-describedby`
- `required`
- Relevant `autocomplete` attributes

Connect each error to its field and use an announcement region for form-level failures.

### Additional accessibility work

- Add a “Skip to main content” link.
- Verify visible keyboard focus on every navigation and footer link.
- Use semantic headings for pricing-plan names.
- Use accessible buttons if the FAQ becomes an accordion.
- Support reduced-motion preferences.
- Complete a keyboard-only launch test.
- Check account, checkout and payment-result states with a screen reader.

## Mobile UI

The homepage does not horizontally overflow at 390px, which is good. However:

- The brand wraps onto two lines inside the fixed navbar.
- The logo, sign-in and trial CTA consume nearly the entire width.
- The page is approximately 8,560px tall at this width.
- The mock simulator becomes too small to demonstrate the product.
- The fully expanded FAQ adds substantial page length.

Recommended changes:

- Shorten the navbar CTA to “Start free”.
- Keep the brand on one line or use a compact mobile treatment.
- Move secondary links into a simple menu.
- Use a real product image with tap-to-enlarge behaviour.
- Convert FAQ items into an accessible accordion.
- Reduce duplicated vertical sections.

## SEO and sharing readiness

The site currently has only a title and description.

Implement:

- Favicon and application icons
- Open Graph image and metadata
- Social-sharing metadata
- Canonical production URL
- `robots.txt`
- Sitemap
- Branded 404 and error pages
- A search-friendly page title that does not depend on the Fred trademark
- Structured organisation or product data only where accurate

## Operational launch requirements

Before the first paying customer, verify:

- Stripe live-mode checkout for both plans
- Production price IDs match the displayed prices
- Webhook retry after a simulated database failure
- Failed-payment and past-due behaviour
- Cancellation immediately versus at the end of the billing period
- Customer portal configuration
- Receipts and billing emails
- Confirmation and password-reset email deliverability
- SPF, DKIM and DMARC for the sending domain
- Support inbox monitoring
- Error monitoring and uptime alerts
- Account deletion and data export process
- Funnel analytics from CTA through first completed case

No analytics or tracking scripts were detected on the homepage. If analytics are added, document them in the privacy materials and collect only what is genuinely useful.

## What should stay

The website does not need to be redesigned from scratch. Retain:

- Emerald and slate visual identity
- Strong desktop typography
- Straightforward section layout
- Fixed CTA navigation
- Free-case entry model
- Clean sign-up card
- Explicit independent-product disclaimer
- Immediate-feedback and safety-gate positioning

## Recommended implementation sequence

1. Fix Stripe entitlement reliability and complete an end-to-end payment test.
2. Publish legal, cancellation, refund, contact and support surfaces.
3. Standardise free-demo and beta language everywhere.
4. Replace the headline and placeholder product mock.
5. Rebuild pricing selection and preserve the selected plan.
6. Add trust, reviewer and content-currency information.
7. Finish sign-up, confirmation and authentication error states.
8. Correct accessibility contrast and form semantics.
9. Simplify mobile navigation and FAQ.
10. Add metadata, icons, monitoring and launch analytics.

## Audit scope and limitations

This audit covered:

- Homepage content and visual hierarchy
- Desktop and 390px mobile rendering
- Navigation and section links
- Pricing presentation
- Footer and legal surfaces
- Sign-up and sign-in entry points
- Password recovery source flow
- Stripe checkout and entitlement source flow
- Accessibility and launch-readiness concerns

The simulator and consultation quizzes were deliberately excluded. No account was created and no live payment was made, so those flows still require a controlled end-to-end launch test.

No application code was changed as part of the audit.
