// Listing-factory stage 005: create a DRAFT Etsy listing for a rendered factory candidate.
// Draft only — never publishes (state stays 'draft' until a human reviews and moves the folder
// to 006-published, which does the actual PATCH state=active + DB listing_id backfill).
//
// Follows the CURRENT live model (create-design-listing.js, made-to-order digital — NOT the
// older instant-download create-digital-listing.js pattern, which was superseded 2026-07-02):
// type=download, when_made=made_to_order, NO file upload, personalization via a text question.
// Buyer flow: /go/<code> -> design -> paste code into Personalization at checkout -> /verify.
//
// Usage: node server/scripts/factory-create-etsy-draft.js <candidate_dir>
//        node server/scripts/factory-create-etsy-draft.js <candidate_dir> --dry-run
// Env: on prod, run with --env-file=.env (needs ETSY_* creds).
import { etsyFetch } from '../services/etsy.js';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'https://openapi.etsy.com/v3/application';
const SHOP = process.env.ETSY_SHOP_ID || '12648302';
const TAXONOMY = 1029; // wall art — matches every other listing in this shop
const PRICE = 6.99;

const PRODUCT_LABEL = {
    'heart-map': 'Heart Map', 'star-map': 'Star Map', 'street-map': 'Street Map',
};

const ALT_TEXT_VARIANTS = [
    'Framed {product} leaning against a wall, close-up on the personalized text',
    '{product} displayed on a console table with dried pampas grass and flowers',
    '{product} leaning against a paneled wall in a bright room',
    '{product} mounted on the wall above a wooden sideboard',
    'Design variant of the {product}, styled on a shelf with white flowers',
];

function attributesFor(manifest) {
    const occasionValues = {
        wedding: [12, 22, 32],
        anniversary: [12, 22],
        'new-home': [27, 50],
        baby: [13, 2773],
        'long-distance': [12, 22],
    }[manifest.occasion] || [12, 22, 32];

    return {
        47626759760: [579],               // Craft: Printing & printmaking
        46803063641: occasionValues,      // Occasion
        145330288592: manifest.occasion === 'baby' ? [2351, 2354, 2358] : [2351, 2354], // Room
        145330288652: [2393],             // Style: Minimalist
        400394338806: manifest.product_line === 'star-map' ? [2532, 439] : [2957, 439], // Subject
        148789511775: [2315],             // Can be personalized: Yes
        406291158455: [3460],             // Orientation: Vertical
    };
}

function productAltTextLabel(manifest) {
    const product = PRODUCT_LABEL[manifest.product_line] || 'Custom Map';
    const productPhrase = product === 'Heart Map' ? 'heart-shaped map' : product.toLowerCase();
    return `personalized ${productPhrase} print in a black frame`;
}

function titleFor(manifest) {
    const product = PRODUCT_LABEL[manifest.product_line] || 'Custom Map';
    const occasion = manifest.occasion || 'wedding';
    const occasionPhrase = {
        wedding: 'Wedding & Anniversary Gift', anniversary: 'Anniversary Gift',
        'new-home': 'New Home Housewarming Gift', 'long-distance': 'Long Distance Gift',
        baby: 'New Baby Gift',
    }[occasion] || 'Personalised Gift';
    return `Custom ${product} Print — Personalised ${occasionPhrase}`.slice(0, 140);
}

// Same buyer-flow copy pattern as create-design-listing.js — /verify as the primary delivery
// path (Etsy never gives sellers the buyer's email, so nothing can be auto-emailed at purchase
// time), free-edit window stated honestly.
function customerDesignCta(manifest, goLink) {
    return [
        'HOW IT WORKS — design & preview yours free, in about 2 minutes',
        '',
        `EASIEST — design it yourself: go to ${goLink}, customise your map (location, date, wording), then copy the short code you're given and paste it into the "Personalisation" box at checkout. You preview and approve everything before we print — nothing is printed until you're happy.`,
        '',
        'Short on time? Tell us your details in the "Personalisation" box instead (names, location, date) and we will create it in the featured design and email a private link to preview and edit before printing.',
    ].join('\n');
}

function descriptionFor(manifest, goLink) {
    const product = PRODUCT_LABEL[manifest.product_line] || 'Custom Map';
    return [
        `Our personalised ${product.toLowerCase()} prints capture the exact place and moment that matters to you.`,
        '',
        customerDesignCta(manifest, goLink),
        '',
        'NEED IT FOR A DATE?',
        '',
        'You will receive your high-resolution digital file instantly by email — no shipping wait, so your gift is ready whenever you need it.',
        '',
        'DIGITAL FILE — PRINT IT ANYWHERE',
        '',
        "This listing is currently digital download only. You'll get a high-resolution file sized for printing at home, at a local print shop, or through a photo-printing service like Walgreens, Walmart, or CVS.",
        '',
        'SIZES',
        '',
        "'A' Sizes (UK): A5, A4, A3, A2, A1",
        'Imperial: 5x7, 8x10, 11x14, 12x16, 16x20, 18x24, 24x36 inches',
        '',
        'OUR PROMISE',
        '',
        'Spotted a typo or want something changed? Every digital file comes with free edits for 30 days — change the names, date or styling whenever you like.',
        '',
        'PLEASE NOTE',
        '',
        'This is a digital product — no physical item is shipped. Because each piece is personalised and made to order, we cannot accept change-of-mind returns — but we will always make a genuine mistake right.',
    ].join('\n');
}

function generatedDescriptionFor(manifest, description, goLink) {
    const goLinkPlaceholder = /(?:\/go\/<[^>]+>|\{\{?\s*go[_ -]?link\s*\}?\}|\[\s*go[_ -]?link\s*\])/i;
    if (description.includes(goLink)) return description;
    if (goLinkPlaceholder.test(description)) {
        return description.replace(goLinkPlaceholder, goLink);
    }
    return `${description}\n\n${customerDesignCta(manifest, goLink)}`;
}

/**
 * Resolve the verified customer-facing entry link for this candidate.
 *
 * This deliberately does not manufacture a fallback URL: a missing short link is
 * an operator/setup error and must stop draft creation before Etsy receives the
 * description.
 */
export function resolveCustomerGoLink(manifest) {
    const templateId = manifest.render?.template_id;
    const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'db.sqlite');
    const db = new Database(dbPath, { readonly: true });
    try {
        const template = db.prepare('SELECT design_group_id FROM templates WHERE id = ?').get(templateId);
        if (!template) {
            throw new Error(`No template '${templateId}' exists — cannot resolve a customer link; create the template first.`);
        }
        if (!template.design_group_id) {
            throw new Error(`Template '${templateId}' has no design_group_id — cannot resolve a customer link.`);
        }

        const designGroup = db.prepare('SELECT listing_id FROM design_groups WHERE id = ?').get(template.design_group_id);
        if (!designGroup) {
            throw new Error(`No design_group '${template.design_group_id}' exists for template '${templateId}' — cannot resolve a customer link.`);
        }
        if (!designGroup.listing_id) {
            throw new Error(`Design group '${template.design_group_id}' has no home listing — link it to a listing before creating an Etsy draft.`);
        }

        const listing = db.prepare('SELECT slug FROM listings WHERE id = ?').get(designGroup.listing_id);
        if (!listing) {
            throw new Error(`No listing exists for design_group '${template.design_group_id}' (listing_id '${designGroup.listing_id}') — repair the listing link first.`);
        }

        const target = `/l/${listing.slug}`;
        const shortLink = db.prepare('SELECT code FROM short_links WHERE target = ?').get(target);
        if (!shortLink) {
            const suggestedCode = listing.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'listing-link';
            throw new Error(`No /go/ short link exists for listing '${listing.slug}' (design_group '${template.design_group_id}') — create one first: node --env-file=.env scripts/create-short-link.js ${suggestedCode} ${target}`);
        }

        return `themappedmoment.com/go/${shortLink.code}`;
    } finally {
        db.close();
    }
}

const DEFAULT_TAGS = {
    wedding: ['Custom Map Print', 'Wedding Gift', 'Engagement Gift', 'Personalised Map', 'Anniversary Gift', 'Couples Gift', 'Where We Met Map', 'Unique Wedding Gift', 'Map Poster', 'Custom Location Art', 'First Anniversary', 'Wall Art Print', 'Newlywed Gift'],
    anniversary: ['Custom Map Print', 'Anniversary Gift', 'Personalised Map', 'Where We Met Map', 'Couples Gift', 'Long Distance Gift', 'Custom Location Map', 'Map Poster', 'First Date Gift', 'Unique Anniversary', 'Wall Art Print', 'Valentines Day Gift', 'Paper Anniversary'],
    'new-home': ['Custom Map Print', 'New Home Gift', 'Housewarming Gift', 'Our First Home', 'Custom City Map', 'Realtor Closing Gift', 'New Homeowner Gift', 'Address Map Print', 'Hometown Map', 'Neighborhood Map', 'Street Map Art', 'Wall Art Print', 'First Home Gift'],
};

async function form(method, apiPath, params) {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) body.append(k, Array.isArray(v) ? v.join(',') : String(v));
    const res = await etsyFetch(`${BASE}${apiPath}`, { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const t = await res.text();
    if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status}: ${t.slice(0, 300)}`);
    return t ? JSON.parse(t) : {};
}

const apiKey = process.env.ETSY_API_SECRET ? `${process.env.ETSY_API_KEY}:${process.env.ETSY_API_SECRET}` : process.env.ETSY_API_KEY;

// alt_text has NO separate update-after-upload endpoint — confirmed empirically (every
// PATCH .../images/{listing_image_id} attempt 404'd, with or without the /shops/{shop}
// prefix). Etsy's createListingImage POST accepts alt_text as a multipart field on the
// SAME call that uploads the image; that's the only place it can be set from our side.
async function uploadImage(listingId, buf, rank, altText) {
    const fd = new FormData();
    fd.append('image', new Blob([buf], { type: 'image/jpeg' }), `img${rank}.jpg`);
    fd.append('rank', String(rank));
    if (altText) fd.append('alt_text', altText);
    const r = await fetch(`${BASE}/shops/${SHOP}/listings/${listingId}/images`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN}` },
        body: fd,
    });
    return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const cliArgs = process.argv.slice(2);
const dryRun = cliArgs.includes('--dry-run');
const candidateDir = cliArgs.find(arg => !arg.startsWith('--'));
if (!candidateDir) { console.error('Usage: node factory-create-etsy-draft.js <candidate_dir>'); process.exit(1); }

(async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(candidateDir, 'manifest.json'), 'utf8'));
    if (!manifest.render?.template_id) {
        throw new Error('manifest.render.template_id missing — run stage 004 first');
    }

    // A network failure after Etsy creates the listing but before the manifest is
    // written used to make a retry create a second draft.  If the manifest already
    // has a draft id, inspect it and stop rather than ever creating a duplicate.
    const existingDraftId = manifest.etsy?.draft_listing_id;
    if (existingDraftId) {
        const existingResponse = await etsyFetch(`${BASE}/listings/${existingDraftId}`);
        if (!existingResponse.ok) {
            throw new Error(`Manifest points to Etsy draft ${existingDraftId}, but GET /listings/${existingDraftId} returned ${existingResponse.status}; refusing to create a duplicate.`);
        }
        const existing = await existingResponse.json();
        if (existing.state !== 'draft') {
            throw new Error(`Manifest points to Etsy listing ${existingDraftId} in state '${existing.state}', not draft; refusing to create another listing.`);
        }
        const existingImagesResponse = await etsyFetch(`${BASE}/listings/${existingDraftId}/images`);
        const existingImages = existingImagesResponse.ok ? await existingImagesResponse.json() : { results: [] };
        const imageCount = Array.isArray(existingImages.results) ? existingImages.results.length : 0;
        if (imageCount === 0) {
            throw new Error(`Etsy draft ${existingDraftId} exists but has no uploaded images; recover that draft manually before retrying.`);
        }
        console.log(`Existing Etsy DRAFT ${existingDraftId} found with ${imageCount} image(s); refusing to create a duplicate.`);
        return;
    }

    // 1. Find listing images for this candidate. Convention: mockup harness output lands under
    // <candidate_dir>/listing_images/*.jpg (a human/executor copies the render there per the
    // Flow-mockup directive — see docs/DIRECTIVE_flow_mockup_and_video_2026-08-19.md). Fall back
    // to just the stage-004 preview.png (single image) so a draft can still be created and
    // reviewed even before mockups exist — better than blocking entirely.
    const imgDir = path.join(candidateDir, 'listing_images');
    let imagePaths = [];
    if (fs.existsSync(imgDir)) {
        imagePaths = fs.readdirSync(imgDir)
            .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
            .sort()
            .map(f => path.join(imgDir, f));
    }
    if (imagePaths.length === 0 && fs.existsSync(path.join(candidateDir, 'preview.png'))) {
        imagePaths = [path.join(candidateDir, 'preview.png')];
        console.log('0) no listing_images/ found — using preview.png as the only image (draft-quality, needs real mockups before publish)');
    }
    if (imagePaths.length === 0) {
        throw new Error('no images available at all (no listing_images/, no preview.png) — cannot create a listing with zero images');
    }
    console.log(`0) ${imagePaths.length} image(s) found`);

    // 2. Create the draft digital listing.
    const occasion = manifest.occasion || 'wedding';
    const goLink = resolveCustomerGoLink(manifest);
    const listingCopyPath = path.join(candidateDir, 'listing_copy.json');
    let title;
    let description;
    let tags;
    if (fs.existsSync(listingCopyPath)) {
        const listingCopy = JSON.parse(fs.readFileSync(listingCopyPath, 'utf8'));
        title = listingCopy.title;
        description = generatedDescriptionFor(manifest, listingCopy.description, goLink);
        tags = listingCopy.tags;
        console.log('1) using listing_copy.json for title/description/tags');
    } else {
        title = titleFor(manifest);
        description = descriptionFor(manifest, goLink);
        tags = DEFAULT_TAGS[occasion] || DEFAULT_TAGS.wedding;
        console.log('1) using fallback titleFor/descriptionFor/DEFAULT_TAGS');
    }

    if (dryRun) {
        console.log(JSON.stringify({
            dry_run: true,
            candidate_dir: path.resolve(candidateDir),
            listing: {
                quantity: 999, title, description, price: PRICE,
                who_made: 'i_did', when_made: 'made_to_order', taxonomy_id: TAXONOMY,
                type: 'download', tags, should_auto_renew: 'false', is_supply: 'false',
            },
            images: imagePaths.map((imagePath, index) => ({
                rank: index + 1,
                path: imagePath,
                bytes: fs.statSync(imagePath).size,
            })),
            personalization: {
                required: false,
                question: 'Personalization',
                max_allowed_characters: 256,
            },
            customer_go_link: goLink,
            note: 'No Etsy API mutation was made; this is a local validation only.',
        }, null, 2));
        return;
    }

    const listing = await form('POST', `/shops/${SHOP}/listings`, {
        quantity: 999, title, description, price: PRICE,
        who_made: 'i_did', when_made: 'made_to_order', taxonomy_id: TAXONOMY,
        type: 'download', tags, should_auto_renew: 'false', is_supply: 'false',
    });
    const id = listing.listing_id;
    console.log(`1) draft listing ${id} created: "${title}"`);

    // Persist the id immediately.  If a later upload or attributes call fails,
    // the next run enters the duplicate guard above instead of creating another
    // Etsy listing and losing track of the partially completed draft.
    manifest.etsy = { ...(manifest.etsy || {}), draft_listing_id: id, title, price: PRICE, tags, image_count: 0 };
    fs.writeFileSync(path.join(candidateDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // 3. Upload images, with alt text set inline (there is no separate update-after-upload
    // endpoint — confirmed empirically, see the comment on uploadImage()).
    console.log('2) uploading images...');
    const product = productAltTextLabel(manifest);
    let rank = 1;
    let uploadFailures = 0;
    for (const p of imagePaths) {
        try {
            const buf = fs.readFileSync(p);
            const altText = ALT_TEXT_VARIANTS[(rank - 1) % ALT_TEXT_VARIANTS.length].replace('{product}', product);
            const r = await uploadImage(id, buf, rank, altText);
            console.log(`   ${r.ok ? '✓' : '✗'} rank ${rank} (${path.basename(p)})${r.ok ? '' : ' ' + r.status + ' ' + (await r.text()).slice(0, 150)}`);
            if (!r.ok) uploadFailures++;
        } catch (e) {
            console.log(`   ✗ rank ${rank} error: ${e.message}`);
            uploadFailures++;
        }
        rank++;
    }
    if (uploadFailures > 0) {
        throw new Error(`${uploadFailures} image upload(s) failed for draft ${id}; draft id was recorded for manual recovery, and no duplicate will be created on retry.`);
    }

    // 4. Personalization.
    const instructions = 'Paste your design code from themappedmoment.com — or type your location, date & names and we will create it for you.';
    const pr = await etsyFetch(`${BASE}/shops/${SHOP}/listings/${id}/personalization`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalization_questions: [{ question_text: 'Personalization', instructions, question_type: 'text_input', required: false, max_allowed_characters: 256 }] }),
    });
    console.log(`3) personalization ${pr.status}`);

    // 5. Taxonomy attributes.
    console.log('4) attributes...');
    const taxJ = await (await etsyFetch(`${BASE}/seller-taxonomy/nodes/${TAXONOMY}/properties`)).json();
    const nameMap = new Map();
    for (const p of taxJ.results) for (const v of (p.possible_values || [])) nameMap.set(v.value_id, v.name);
    for (const [propertyId, valueIds] of Object.entries(attributesFor(manifest))) {
        const names = valueIds.map(v => nameMap.get(v)).filter(Boolean);
        const abody = new URLSearchParams();
        for (const v of valueIds) abody.append('value_ids', v);
        for (const n of names) abody.append('values', n);
        const ar = await etsyFetch(`${BASE}/shops/${SHOP}/listings/${id}/properties/${propertyId}`, { method: 'PUT', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: abody });
        console.log(`   ${ar.ok ? '✓' : '✗'} ${propertyId} [${names.join(', ')}]`);
    }

    // 6. Record back into the candidate manifest — the caller (run_stage.py) persists this.
    manifest.etsy = { ...(manifest.etsy || {}), draft_listing_id: id, title, price: PRICE, tags, image_count: imagePaths.length };
    fs.writeFileSync(path.join(candidateDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\nDONE — DRAFT listing ${id}. NOT published. Human review required before 006.`);
    console.log(`Review: https://www.etsy.com/your/shops/me/tools/listings/${id}`);
    console.log(id); // last line: bare id for scripting
})().catch(e => { console.error('✗ FAILED:', e.message); process.exit(1); });
}
