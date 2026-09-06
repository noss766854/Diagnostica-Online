const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const apiKey = `sk_test_${"A".repeat(24)}`;
const fallbackKey = `sk_test_${"B".repeat(24)}`;
const webhookSecret = `whsec_${"C".repeat(32)}`;
const credentialsPath = "app/api/admin/billing/credentials/route.ts";

// Run the real handlers and crypto against an in-memory Supabase transport.
// No environment files are read and every unmocked network request fails.
function fixture({ missingSecretsTable = false, env = {}, fetch: fetchMock } = {}) {
  const tables = new Map();
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  for (const role of ["admin", "customer", "mechanic", "disabled"]) {
    table("profiles").set(role, { id: role, role: role === "disabled" ? "admin" : role, is_disabled: role === "disabled" });
    table("user_plans").set(role, { user_id: role, plan_tier: "free", status: "active" });
  }
  const supabase = {
    auth: {
      async getUser(token) {
        return { data: { user: table("profiles").has(token) ? { id: token, email: `${token}@example.com` } : null } };
      },
    },
    from(name) {
      const filters = [];
      let action = "select";
      let value;
      const query = {
        select() { return query; },
        eq(key, expected) { filters.push([key, expected]); return query; },
        upsert(row) { action = "upsert"; value = row; return query; },
        insert(row) { action = "insert"; value = row; return query; },
        update(row) { action = "update"; value = row; return query; },
        delete() { action = "delete"; return query; },
        maybeSingle() { return execute(true); },
        single() { return execute(true); },
        then(resolve, reject) { return execute(false).then(resolve, reject); },
      };
      async function execute(single) {
        if (name === "platform_secrets" && missingSecretsTable) return { data: null, error: { message: "relation platform_secrets does not exist" } };
        const rows = table(name);
        let matches = [...rows.values()].filter((row) => filters.every(([key, expected]) => row[key] === expected));
        if (action === "upsert" || action === "insert") {
          const key = value.key || value.id || value.event_id || value.user_id || String(rows.size + 1);
          const row = { ...(rows.get(key) || {}), ...structuredClone(value) };
          if (name === "call_bookings" && !row.id) row.id = key;
          rows.set(key, row);
          matches = [row];
        }
        if (action === "update" || action === "delete") {
          for (const [key, row] of rows) {
            if (!matches.includes(row)) continue;
            if (action === "delete") rows.delete(key);
            else rows.set(key, { ...row, ...structuredClone(value) });
          }
        }
        return { data: single ? matches[0] || null : matches, error: null, count: matches.length };
      }
      return query;
    },
  };
  const environment = {
    PUBLIC_SITE_URL: "https://diagnostica-online.com",
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-encryption-key-only",
    ...env,
  };
  const cache = new Map();
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports;
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    cache.set(relative, module);
    const sandbox = { Buffer, URL, URLSearchParams, Request, Response, Headers, console, process: { env: environment }, fetch: fetchMock || (() => { throw new Error("Unexpected network request"); }) };
    const execute = vm.runInNewContext(`(function(require, module, exports) { ${output}\n})`, sandbox, { filename: relative });
    execute((specifier) => {
      if (specifier === "@/lib/platform/supabase") return { supabaseService: () => supabase, bearerToken: (request) => request.headers.get("authorization")?.replace(/^Bearer /, "") || "" };
      if (specifier === "@supabase/supabase-js") return { createClient: () => supabase };
      if (specifier === "@/lib/platform/env") return { serverEnvironment: () => ({ supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY, routeraApiKey: environment.ROUTERA_API_KEY || "" }) };
      if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
      return require(specifier);
    }, module, module.exports);
    return module.exports;
  }
  return { table, load, secrets: load("lib/platform/secrets.ts") };
}

function request(method, body, token = "admin") {
  return new Request("https://diagnostica-online.com/api/admin/billing/credentials", {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}

test("Stripe secrets are encrypted, isolated, and take priority over environment values", async () => {
  const f = fixture({ env: { STRIPE_SECRET_KEY: fallbackKey } });
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  await f.secrets.saveStripeCredential("webhookSecret", webhookSecret, "admin");
  const stored = f.table("platform_secrets").get("stripe_secret_key").encrypted_value;
  assert(!stored.includes(apiKey));
  assert(stored.startsWith("v1:"));
  const result = await f.secrets.resolveStripeCredentials();
  assert.equal(result.secretKey.apiKey, apiKey);
  assert.equal(result.webhookSecret.apiKey, webhookSecret);
  assert.equal(result.secretKey.source, "admin");
  f.table("platform_secrets").get("stripe_webhook_secret").encrypted_value = stored;
  await assert.rejects(f.secrets.resolveStripeCredential("webhookSecret"), /could not be decrypted/);
});

test("fallback storage preserves simultaneous Stripe saves and the existing Routera credential", async () => {
  const f = fixture({ missingSecretsTable: true, env: { STRIPE_SECRET_KEY: fallbackKey } });
  const routeraKey = `rta_${"R".repeat(32)}`;
  await Promise.all([
    f.secrets.saveStripeCredential("secretKey", apiKey, "admin"),
    f.secrets.saveStripeCredential("webhookSecret", webhookSecret, "admin"),
    f.secrets.saveRouteraCredential(routeraKey, "admin"),
  ]);
  assert.equal((await f.secrets.resolveStripeCredential("secretKey")).apiKey, apiKey);
  assert.equal((await f.secrets.resolveStripeCredential("webhookSecret")).apiKey, webhookSecret);
  assert.equal((await f.secrets.resolveRouteraCredential()).apiKey, routeraKey);
  assert.equal(f.table("site_settings").has("public_content"), false);
  assert.equal((await f.secrets.removeStripeCredential("secretKey")).source, "vercel");
  assert.equal((await f.secrets.resolveStripeCredential("secretKey")).apiKey, fallbackKey);
  assert.equal((await f.secrets.resolveStripeCredential("webhookSecret")).apiKey, webhookSecret);
  assert.equal((await f.secrets.resolveRouteraCredential()).apiKey, routeraKey);
});

test("removing a saved key clears both storage locations and restores the fallback", async () => {
  const f = fixture({ env: { STRIPE_SECRET_KEY: fallbackKey } });
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  const encrypted = f.table("platform_secrets").get("stripe_secret_key").encrypted_value;
  f.table("site_settings").set("private_stripe_secret_key", { key: "private_stripe_secret_key", value: { secrets: { stripe_secret_key: encrypted } } });
  await f.secrets.removeStripeCredential("secretKey");
  assert.equal((await f.secrets.resolveStripeCredential("secretKey")).apiKey, fallbackKey);
  assert.equal(f.table("platform_secrets").has("stripe_secret_key"), false);
  assert.equal(f.table("site_settings").get("private_stripe_secret_key").value.secrets.stripe_secret_key, undefined);
});

test("credential routes reject guests, customers, mechanics, and disabled admins", async () => {
  const f = fixture();
  const route = f.load(credentialsPath);
  for (const [token, status] of [["", 401], ["customer", 403], ["mechanic", 403], ["disabled", 403]]) {
    for (const method of ["GET", "POST", "DELETE"]) {
      const response = await route[method](request(method, { kind: "secretKey", value: apiKey }, token));
      assert.equal(response.status, status, `${token || "guest"} ${method}`);
    }
  }
  assert.equal(f.table("platform_secrets").size, 0);
});

test("admin save/status responses and audit logs never disclose plaintext secrets", async () => {
  const f = fixture();
  const route = f.load(credentialsPath);
  const saved = await route.POST(request("POST", { kind: "secretKey", value: ` ${apiKey} ` }));
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  const result = await saved.json();
  assert.deepEqual(result, { configured: true, source: "admin", suffix: apiKey.slice(-4) });
  const status = await (await route.GET(request("GET"))).json();
  assert.equal(status.webhookUrl, "https://diagnostica-online.com/api/webhooks/stripe");
  assert.equal(status.webhookSecret.configured, false);
  assert(!JSON.stringify(status).includes(apiKey));
  assert(!JSON.stringify([...f.table("admin_audit_logs").values()]).includes(apiKey));
});

test("invalid, blank, publishable, oversized, and unknown credential inputs are rejected", async () => {
  const f = fixture();
  const route = f.load(credentialsPath);
  for (const body of [
    { kind: "secretKey", value: "" },
    { kind: "secretKey", value: `pk_test_${"P".repeat(24)}` },
    { kind: "webhookSecret", value: apiKey },
    { kind: "secretKey", value: `sk_test_${"A".repeat(501)}` },
    { kind: "anythingElse", value: apiKey },
    { kind: "secretKey", value: apiKey, extra: "unexpected" },
  ]) assert.equal((await route.POST(request("POST", body))).status, 400);
  assert.equal(f.table("platform_secrets").size, 0);
});

test("Stripe API requests use the saved secret immediately", async () => {
  const calls = [];
  const f = fixture({ env: { STRIPE_SECRET_KEY: fallbackKey }, fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json({ url: "https://checkout.stripe.com/test" });
  } });
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  await f.load("lib/platform/stripe.ts").stripeRequest("billing_portal/sessions");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${apiKey}`);
  assert.equal(calls[0].url, "https://api.stripe.com/v1/billing_portal/sessions");
});

test("webhook handler authenticates with the saved signing secret and rejects altered payloads", async () => {
  const f = fixture();
  await f.secrets.saveStripeCredential("webhookSecret", webhookSecret, "admin");
  const route = f.load("app/api/webhooks/stripe/route.ts");
  const payload = JSON.stringify({ id: "evt_test", type: "test.ignored", data: { object: {} } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest("hex");
  const webhookRequest = (body) => new Request("https://diagnostica-online.com/api/webhooks/stripe", { method: "POST", body, headers: { "stripe-signature": `t=${timestamp},v1=${signature}` } });
  assert.equal((await route.POST(webhookRequest(payload + " "))).status, 400);
  assert.equal(f.table("stripe_webhook_events").size, 0);
  assert.equal((await route.POST(webhookRequest(payload))).status, 200);
  assert.equal(f.table("stripe_webhook_events").get("evt_test").status, "processed");
});

test("paid-call checkout uses Admin credentials and saved booking legal details", async () => {
  const calls = [];
  const f = fixture({ fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: "cs_test_booking", url: "https://checkout.stripe.com/test" });
  } });
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  await f.secrets.saveStripeCredential("webhookSecret", webhookSecret, "admin");
  const route = f.load("app/api/checkout/route.js");
  const body = { callType: "video", durationMinutes: 30 };
  assert.equal((await route.POST(request("POST", body, "customer"))).status, 503);
  assert.equal(calls.length, 0);
  f.table("site_settings").set("public_content", { key: "public_content", value: { businessAddress: "Example address", refundText: "Final booking refund terms" } });
  const response = await route.POST(request("POST", body, "customer"));
  assert.equal(response.status, 200);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${apiKey}`);
  assert.equal(calls[0].options.body.get("line_items[0][price_data][unit_amount]"), "2000");
  assert.equal([...f.table("call_bookings").values()][0].status, "checkout_started");
});

test("Premium checkout uses the saved Stripe key with the selected price", async () => {
  const calls = [];
  const f = fixture({ fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: "cs_test_premium", url: "https://checkout.stripe.com/test" });
  } });
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  f.table("site_settings").set("public_content", { key: "public_content", value: { premiumPlans: [{ key: "monthly", active: true, stripePriceId: "price_testMonthly123" }] } });
  const response = await f.load("app/api/billing/checkout/route.ts").POST(request("POST", { planKey: "monthly" }, "customer"));
  assert.equal(response.status, 200);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${apiKey}`);
  assert.equal(calls[0].options.body.get("line_items[0][price]"), "price_testMonthly123");
});

test("paid-booking legal readiness rejects placeholders and whitespace", () => {
  const { paidBookingLegalDetails } = fixture().load("lib/platform/booking-legal.ts");
  for (const content of [{}, { businessAddress: "   ", refundText: "Final terms" }, { businessAddress: "Add your business address in admin.", refundText: "Final terms" }, { businessAddress: "Example address", refundText: "Add your final refund policy" }]) {
    assert.equal(paidBookingLegalDetails(content).ready, false);
  }
  assert.equal(paidBookingLegalDetails({ businessAddress: "Example address", refundText: "Final cancellation and refund terms." }).ready, true);
  assert.equal(paidBookingLegalDetails({ businessAddress: "Example address", refundText: "  ", refundPolicySummary: "Final legacy refund terms." }).ready, true);
});

test("Admin readiness reports saved Stripe credentials and links to the editable fields", async () => {
  const f = fixture();
  await f.secrets.saveStripeCredential("secretKey", apiKey, "admin");
  await f.secrets.saveStripeCredential("webhookSecret", webhookSecret, "admin");
  f.table("site_settings").set("public_content", { key: "public_content", value: { businessAddress: "Example address", refundText: "Final refund terms" } });
  const response = await f.load("app/api/admin/config/status/route.ts").GET(request("GET"));
  assert.equal(response.status, 200);
  const { items } = await response.json();
  for (const label of ["Stripe secret key", "Stripe webhook secret", "Paid-booking legal details"]) {
    const item = items.find((entry) => entry.label === label);
    assert.equal(item.configured, true);
    assert(item.href.startsWith("#"));
  }
});
