// netlify/functions/audit.js
//
// Free AI Website Audit — backend
// Receives { url }, fetches that page, extracts lightweight technical
// signals (no heavy parsing library needed), then asks Claude to turn
// those signals into a plain-English audit. The Anthropic API key stays
// server-side via the ANTHROPIC_API_KEY environment variable — never
// exposed to the browser.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  let targetUrl;
  try {
    const body = JSON.parse(event.body || '{}');
    targetUrl = (body.url || '').trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  if (!/^https?:\/\/.+/i.test(targetUrl)) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: 'Please enter a full URL starting with http:// or https://' })
    };
  }

  // ---------- 1. Fetch the target page ----------
  let html;
  try {
    const pageRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AiMDNexusAuditBot/1.0)' },
      redirect: 'follow'
    });
    if (!pageRes.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: `We couldn't load that site (status ${pageRes.status}). Double-check the URL and that the site is publicly accessible.`
        })
      };
    }
    html = await pageRes.text();
  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: "We couldn't reach that URL. Check it's correct and publicly accessible, then try again." })
    };
  }

  // ---------- 2. Extract lightweight signals ----------
  const getFirstMatch = (re) => {
    const m = html.match(re);
    return m ? m[1].trim() : null;
  };

  const title = getFirstMatch(/<title[^>]*>([^<]*)<\/title>/i);
  const metaDescription =
    getFirstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    getFirstMatch(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const h1Matches = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gis)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .slice(0, 5);
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const imgCount = (html.match(/<img[\s>]/gi) || []).length;
  const imgNoAltCount = (html.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length;
  const hasSSL = targetUrl.toLowerCase().startsWith('https://');
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = visibleText ? visibleText.split(' ').length : 0;
  const hasFormOrCta = /<form[\s>]/i.test(html) || /class=["'][^"']*\b(btn|cta|button)\b/i.test(html);

  const signals = {
    url: targetUrl,
    title,
    titleLength: title ? title.length : 0,
    metaDescription,
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    hasViewport,
    h1Count: h1Matches.length,
    h1Text: h1Matches,
    h2Count,
    imgCount,
    imgNoAltCount,
    hasSSL,
    wordCount,
    hasFormOrCta
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: 'The audit tool is not fully configured yet (missing API key). Please try again later.' })
    };
  }

  // ---------- 3. Ask Claude to turn signals into a plain-English audit ----------
  const prompt = `You are a website conversion and SEO auditor. Based on the technical signals and page text excerpt below, respond with ONLY a JSON object (no markdown fences, no preamble, no trailing commentary) in exactly this shape:

{
  "overallImpression": "one encouraging but honest sentence about the site as a whole",
  "findings": [
    { "area": "SEO Basics", "status": "pass|warning|fail", "note": "one specific sentence" },
    { "area": "Mobile Friendliness", "status": "pass|warning|fail", "note": "one specific sentence" },
    { "area": "Content & Headings", "status": "pass|warning|fail", "note": "one specific sentence" },
    { "area": "Conversion Elements", "status": "pass|warning|fail", "note": "one specific sentence" },
    { "area": "Security", "status": "pass|warning|fail", "note": "one specific sentence" }
  ],
  "topFixes": ["short actionable fix 1", "short actionable fix 2", "short actionable fix 3"]
}

Technical signals:
${JSON.stringify(signals, null, 2)}

Page text excerpt (tags stripped, may be truncated):
${visibleText.slice(0, 3000)}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'The audit engine is temporarily unavailable. Please try again shortly.' })
      };
    }

    const textBlock = (aiData.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'The audit engine returned an unexpected response. Please try again.' })
      };
    }

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const audit = JSON.parse(cleaned);

    return {
      statusCode: 200,
      body: JSON.stringify({ signals, audit })
    };
  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: 'Something went wrong generating the audit. Please try again in a moment.' })
    };
  }
};
