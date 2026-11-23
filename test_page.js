/* Page-level test: runs index.html's inline script under a minimal DOM
 * stub in Node, loads the real places.json, and drives both lookups.
 * Run: node test_page.js (exit 0 only when every check passes).
 *
 * This checks the page's own render path and wording. It cannot check
 * real browser behaviour (focus movement, aria-live announcement, the
 * Facebook webview close button) -- those need a live browser check
 * after deploy.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
const places = JSON.parse(fs.readFileSync(path.join(DIR, "places.json"), "utf8"));
const GridLocator = require("./grid.js");

/* Pull out the main inline <script> block (the one without a src
 * attribute that holds the lookups; the one-line theme script in the
 * head is not it). */
const blocks = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)];
const m = blocks.find((b) => b[1].indexOf("function lookupGrid") !== -1);
if (!m) { console.log("FAIL  no inline script block found"); process.exit(1); }
const inlineJs = m[1];
fs.writeFileSync("/tmp/grid-inline-check.js", inlineJs);

let failures = 0;
function check(name, cond, detail) {
  if (!cond) failures++;
  console.log((cond ? "PASS" : "FAIL") + "  " + name + (detail ? "  | " + detail : ""));
}

/* ---- minimal DOM stub ---- */
function makeElement(id) {
  return {
    id: id || "", textContent: "", innerHTML: "", className: "",
    disabled: true, value: "", href: "",
    _listeners: {},
    addEventListener: function (type, fn) { this._listeners[type] = fn; },
    focus: function () { this._focused = true; },
    scrollIntoView: function () {},
    querySelectorAll: function () { return []; },
    parentNode: { insertBefore: function () {}, replaceChild: function () {} },
    setAttribute: function () {},
    getAttribute: function () { return null; }
  };
}
const elements = {};
["load-status", "grid-fieldset", "place-fieldset", "grid-form", "place-form",
 "grid-input", "place-input", "grid-result", "place-result", "example-btn",
 "lookup-grid", "accessibility-toggle"].forEach((id) => { elements[id] = makeElement(id); });

global.window = {
  GridLocator: GridLocator,
  location: { href: "", reload: function () {} },
  close: function () {}
};
Object.defineProperty(global, "navigator",
  { value: { userAgent: "NodeTest/1.0" }, configurable: true });
global.document = {
  getElementById: function (id) { return elements[id] || null; },
  querySelectorAll: function () { return []; },
  createElement: function () { return makeElement(""); },
  hidden: false
};
global.fetch = function (url) {
  check("page fetches only places.json", url === "places.json", "fetched: " + url);
  return Promise.resolve({
    ok: true,
    json: function () { return Promise.resolve(places); }
  });
};

/* Run the page script. */
eval(inlineJs);

/* Let the fetch promise resolve, then drive the forms. */
setTimeout(function () {
  check("place list loads: status mentions 40,237 places",
    elements["load-status"].textContent.indexOf("40,237") !== -1,
    elements["load-status"].textContent);
  check("grid fieldset enabled after load", elements["grid-fieldset"].disabled === false);
  check("place fieldset enabled after load", elements["place-fieldset"].disabled === false);

  function submit(formId, inputId, value) {
    elements[inputId].value = value;
    elements[formId]._listeners.submit({ preventDefault: function () {} });
  }

  /* Grid lookup: EN61CN */
  submit("grid-form", "grid-input", "EN61CN");
  const g = elements["grid-result"].innerHTML;
  check("EN61CN result names Tinley Park, Illinois", g.indexOf("Tinley Park, Illinois") !== -1);
  check("EN61CN result gives distance in words", g.indexOf("1.2 kilometers (0.8 miles)") !== -1);
  check("EN61CN result gives direction north-west", g.indexOf("north-west") !== -1);
  check("EN61CN result spells the grid for screen readers", g.indexOf("E N 6 1 C N") !== -1);
  check("EN61CN result shows the centre in words",
    g.indexOf("41.5625 degrees north, 87.7917 degrees west (-87.7917)") !== -1);
  check("EN61CN result offers copy buttons with signed values",
    g.indexOf('data-copy="41.5625"') !== -1 && g.indexOf('data-copy="-87.7917"') !== -1);
  check("EN61CN result shows the corners",
    g.indexOf("41.5417 degrees north, 87.8333 degrees west (-87.8333)") !== -1
    && g.indexOf("41.5833 degrees north, 87.7500 degrees west (-87.7500)") !== -1);
  check("EN61CN result shows the size", g.indexOf("wide and") !== -1 && g.indexOf("tall") !== -1);
  check("EN61CN result lists also-nearby places", g.indexOf("Also nearby") !== -1);
  check("EN61CN result carries the not-inside-the-square note",
    g.indexOf("may not be inside the square") !== -1);
  check("EN61CN result got focus", elements["grid-result"]._focused === true);
  console.log("--- EN61CN headline (text only) ---");
  console.log(g.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400));

  /* Example button: fills EN61CN and runs the lookup */
  elements["grid-input"].value = "";
  elements["example-btn"]._listeners.click();
  check("example button fills EN61CN", elements["grid-input"].value === "EN61CN");
  check("example button runs the lookup",
    elements["grid-result"].innerHTML.indexOf("Tinley Park, Illinois") !== -1);

  /* Grid lookup: bad input */
  submit("grid-form", "grid-input", "ZZ99");
  check("bad grid shows an error panel", elements["grid-result"].className === "result-error");
  check("bad grid error is plain language",
    elements["grid-result"].innerHTML.indexOf("first two letters") !== -1);

  /* Grid lookup: 4-character square */
  submit("grid-form", "grid-input", "FN21");
  const f = elements["grid-result"].innerHTML;
  check("FN21 result names Masthope, Pennsylvania", f.indexOf("Masthope, Pennsylvania") !== -1);
  check("FN21 result suggests the 6-character square", f.indexOf("6 characters") !== -1);

  /* Place lookup: Tinley Park */
  submit("place-form", "place-input", "Tinley Park");
  const p = elements["place-result"].innerHTML;
  check("place search finds Tinley Park, Illinois", p.indexOf("Tinley Park, Illinois") !== -1);
  check("place search shows the spelled 6-char grid", p.indexOf("E N 6 1 C N") !== -1);
  check("place search shows the 4-char grid", p.indexOf("E N 6 1") !== -1);
  check("place search offers a Show this square button", p.indexOf('data-grid="EN61CN"') !== -1);
  check("place search offers copy buttons with signed values",
    p.indexOf('data-copy="41.5686"') !== -1 && p.indexOf('data-copy="-87.8042"') !== -1);

  check("page includes the visual map container", html.indexOf('id="map"') !== -1);
  check("page loads the vendored Leaflet code", html.indexOf('src="leaflet.js"') !== -1);
  check("page offers an Accessibility button", html.indexOf('id="accessibility-toggle"') !== -1);
  check("page follows the device light setting", html.indexOf("prefers-color-scheme: light") !== -1);
  check("page remembers the theme choice", html.indexOf("grid-locator-theme") !== -1);
  check("map tiles switch with the theme", html.indexOf("rastertiles/dark_all") !== -1 && html.indexOf("rastertiles/light_all") !== -1);
  check("page uses keyed CARTO tiles", html.indexOf("basemaps.cartocdn.com/rastertiles/") !== -1 && html.indexOf("?key=") !== -1);
  check("page no longer uses Esri tiles", html.indexOf("arcgisonline.com") === -1);

  /* Place lookup: no match */
  submit("place-form", "place-input", "Zzxqy Noplace");
  check("no-match search shows an error panel", elements["place-result"].className === "result-error");
  check("no-match message mentions the 75,000 limit",
    elements["place-result"].innerHTML.indexOf("75,000") !== -1);

  /* Place lookup: region filter */
  submit("place-form", "place-input", "London, Canada");
  const l = elements["place-result"].innerHTML;
  check("region filter finds London, Canada", l.indexOf("London, Canada") !== -1);

  console.log("\n" + (failures === 0 ? "ALL PAGE CHECKS PASSED" : failures + " PAGE CHECK(S) FAILED"));
  process.exit(failures === 0 ? 0 : 1);
}, 100);
