# PDP + homepage crawl batch

Observe-only crawl. `[none]` = watched vendor (Klaviyo/Meta) present, no beacon yet; `[unobservable]` = present, no wired matcher (pre-probe). Platform column is the key SFCC/BigCommerce fingerprint check.

| Site          | Page | Guess    | Platform detected | Vendors | AdPix | ESP/SMS                        | Loyalty         | Recs          | Email | BlueConic | Status           | ms    |
| ------------- | ---- | -------- | ----------------- | ------- | ----- | ------------------------------ | --------------- | ------------- | ----- | --------- | ---------------- | ----- |
| solostove     | home | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| solostove     | pdp  | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| blackdiamond  | home | sfcc/bc? | shopify           | 7       | 2     | klaviyo                        | yotpo           | -             | y     | -         | ok               | 7333  |
| blackdiamond  | pdp  | sfcc/bc? | shopify           | 7       | 2     | klaviyo                        | yotpo           | -             | y     | -         | ok               | 16077 |
| llbean        | home | sfcc/bc? | **none**          | 12      | 9     | -                              | -               | dynamic_yield | y     | -         | ok               | 17676 |
| llbean        | pdp  | sfcc/bc? | **none**          | 12      | 9     | -                              | -               | dynamic_yield | y     | -         | ok               | 17118 |
| columbia      | home | sfcc/bc? | sfcc              | 1       | 0     | -                              | -               | -             | -     | -         | ok               | 16260 |
| columbia      | pdp  | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| katespade     | home | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| katespade     | pdp  | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| calvinklein   | home | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| calvinklein   | pdp  | sfcc/bc? | **none**          | 0       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| tommyhilfiger | home | sfcc/bc? | sfcc              | 1       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| tommyhilfiger | pdp  | sfcc/bc? | sfcc              | 1       | 0     | -                              | -               | -             | -     | -         | fail:bot_blocked | 0     |
| kosas         | pdp  | shopify  | shopify           | 9       | 5     | klaviyo, postscript            | -               | -             | y     | -         | ok               | 16037 |
| drsquatch     | pdp  | shopify  | shopify           | 14      | 9     | klaviyo, mailchimp, postscript | -               | -             | y     | -         | ok               | 9145  |
| olipop        | pdp  | shopify  | shopify           | 13      | 8     | klaviyo                        | skio            | rebuy         | y     | -         | ok               | 16781 |
| magicspoon    | pdp  | shopify  | shopify           | 18      | 11    | klaviyo, attentive             | recharge, yotpo | rebuy         | y     | -         | ok               | 16220 |
| tommyjohn     | pdp  | shopify  | shopify           | 16      | 10    | klaviyo, attentive             | yotpo           | dynamic_yield | y     | -         | ok               | 15948 |

## Per-page vendor detail

### solostove — home

<https://www.solostove.com/>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### solostove — pdp

<https://www.solostove.com/us/en-us/p/solo-stove-summit-19.5?sku=SS19.5-SD-3.0>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### blackdiamond — home

<https://blackdiamondequipment.com/>

- status: ok (7333ms), streaming gate: PASS
- vendors: shopify[unobservable/network], yotpo[unobservable/network], klaviyo[none/network], google_tag_manager[unobservable/network], ga4[unobservable/network], wunderkind[unobservable/js_global], email_capture[unobservable/dom]
- observable absences: sms, recs, identity

### blackdiamond — pdp

<https://blackdiamondequipment.com/products/mens-alpenglow-hoody?variant=51509694005565>

- status: ok (16077ms), streaming gate: PASS
- vendors: shopify[unobservable/network], klaviyo[none/network], yotpo[unobservable/network], google_tag_manager[unobservable/network], ga4[unobservable/network], wunderkind[unobservable/js_global], email_capture[unobservable/dom]
- observable absences: sms, recs, identity

### llbean — home

<https://www.llbean.com/>

- status: ok (17676ms), streaming gate: PASS
- vendors: dynamic_yield[unobservable/network], tealium[unobservable/network], ga4[unobservable/network], meta[none/network], bing[unobservable/network], tiktok[unobservable/network], pinterest[unobservable/network], criteo[unobservable/network], google_ads[unobservable/network], reddit[unobservable/network], google_tag_manager[unobservable/js_global], email_capture[unobservable/dom]
- observable absences: esp, sms, exit_intent, platform, loyalty

### llbean — pdp

<https://www.llbean.com/llb/shop/5865881?page=Sunwashed-Denim-Shirt-Long-Sleeve-Slightly-Fitted-Mens-Tall&bc=511742-20010102&feat=20010102-GN0&csp=f&attrValue_0=34714&pos=3>

- status: ok (17118ms), streaming gate: PASS
- vendors: dynamic_yield[unobservable/network], tealium[unobservable/network], ga4[unobservable/network], meta[none/network], bing[unobservable/network], tiktok[unobservable/network], criteo[unobservable/network], pinterest[unobservable/network], google_ads[unobservable/network], reddit[unobservable/network], google_tag_manager[unobservable/js_global], email_capture[unobservable/dom]
- observable absences: esp, sms, exit_intent, platform, loyalty

### columbia — home

<https://www.columbia.com/>

- status: ok (16260ms), streaming gate: PASS
- vendors: sfcc[unobservable/js_global]
- observable absences: esp, sms, exit_intent, ad_pixel, recs, identity, loyalty, email_capture

### columbia — pdp

<https://www.columbia.com/p/mens-tellurix-titanium-outdry-shoe-2148851.html?color=383>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### katespade — home

<https://www.katespade.com/>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### katespade — pdp

<https://www.katespade.com/products/k-as-in-kate-runner/KM812-001.html?rrec=true>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### calvinklein — home

<https://www.calvinklein.us/>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### calvinklein — pdp

<https://www.calvinklein.us/en/men/apparel/tshirts-tanks/circle-logo-monogram-graphic-tee/4RG879G-P4P.html?journey=shop-all-tees>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: none
- observable absences: none

### tommyhilfiger — home

<https://usa.tommy.com/>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: sfcc[unobservable/network]
- observable absences: none

### tommyhilfiger — pdp

<https://usa.tommy.com/en/men/clothing/tops/regular-fit-striped-linen-blend-shirt/XM07399-AEY.html?journey=all-gender-linenshop-men>

- status: fail:bot_blocked (0ms), streaming gate: n/a
- vendors: sfcc[unobservable/network]
- observable absences: none

### kosas — pdp

<https://kosas.com/products/cloud-set-loose?variant=44113031102521>

- status: ok (16037ms), streaming gate: PASS
- vendors: shopify[unobservable/network], klaviyo[none/network], ga4[unobservable/network], tiktok[unobservable/network], meta[none/network], google_ads[unobservable/network], postscript[unobservable/network], google_tag_manager[unobservable/js_global], email_capture[unobservable/dom]
- observable absences: exit_intent, recs, identity, loyalty

### drsquatch — pdp

<https://www.drsquatch.com/products/deodorant-4-pack-1>

- status: ok (9145ms), streaming gate: PASS
- vendors: shopify[unobservable/network], ga4[unobservable/network], meta[none/network], google_tag_manager[unobservable/network], bing[unobservable/network], klaviyo[none/network], tiktok[unobservable/network], snap[unobservable/network], pinterest[unobservable/network], postscript[unobservable/network], amazon[unobservable/network], trade_desk[unobservable/network], mailchimp[unobservable/network], email_capture[unobservable/dom]
- observable absences: exit_intent, recs, identity, loyalty

### olipop — pdp

<https://drinkolipop.com/products/crisp-apple>

- status: ok (16781ms), streaming gate: PASS
- vendors: shopify[unobservable/network], skio[unobservable/network], klaviyo[none/network], ga4[unobservable/network], rebuy[unobservable/network], amazon[unobservable/network], reddit[unobservable/network], tiktok[unobservable/network], pinterest[unobservable/network], google_tag_manager[unobservable/network], google_ads[unobservable/network], meta[none/js_global], email_capture[unobservable/dom]
- observable absences: sms, exit_intent, identity

### magicspoon — pdp

<https://magicspoon.com/products/smores-protein-cereal-marshmallows-1case-4boxes?selling_plan=3403284542>

- status: ok (16220ms), streaming gate: PASS
- vendors: shopify[unobservable/network], klaviyo[none/network], rebuy[unobservable/network], trade_desk[unobservable/network], meta[none/network], amazon[unobservable/network], attentive[unobservable/network], snap[unobservable/network], pinterest[unobservable/network], google_tag_manager[unobservable/network], ga4[unobservable/network], tiktok[unobservable/network], google_ads[unobservable/network], reddit[unobservable/network], recharge[unobservable/network], yotpo[unobservable/network], bing[unobservable/network], email_capture[unobservable/dom]
- observable absences: exit_intent, identity

### tommyjohn — pdp

<https://www.tommyjohn.com/products/second-skin-deep-v-neck-stay-tucked-undershirt-1?color=white>

- status: ok (15948ms), streaming gate: PASS
- vendors: shopify[unobservable/network], dynamic_yield[unobservable/network], klaviyo[none/network], yotpo[unobservable/network], attentive[unobservable/network], criteo[unobservable/network], ga4[unobservable/network], reddit[unobservable/network], google_tag_manager[unobservable/network], amazon[unobservable/network], trade_desk[unobservable/network], google_ads[unobservable/network], tiktok[unobservable/network], meta[none/network], bing[unobservable/network], email_capture[unobservable/dom]
- observable absences: exit_intent, identity
