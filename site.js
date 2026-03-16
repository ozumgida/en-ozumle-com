function calculateShippingPrice(items) {
let weight = 0;
for (let i = 0; i < items.length; i++) {
weight += items[i].weight * items[i].quantity;
}
weight = weight / 1000;
if (weight <= 5) { return 185; }
if (weight <= 10) { return 220; }
if (weight < 15) { return 280; }
return 0;
}
(function() {
let imgs = document.querySelectorAll("img[data-src]");
if (!imgs.length) { return; }
let observer = new IntersectionObserver(function(entries) {
for (let i = 0; i < entries.length; i++) {
if (entries[i].isIntersecting) {
let img = entries[i].target;
let real = new Image();
real.onload = function() {
this._target.src = this._target.dataset.src;
this._target.removeAttribute("data-src");
};
real._target = img;
real.src = img.dataset.src;
observer.unobserve(img);
}
}
});
for (let i = 0; i < imgs.length; i++) { observer.observe(imgs[i]); }
})();
if ("serviceWorker" in navigator) {
navigator.serviceWorker.register("/sw.js");
navigator.serviceWorker.ready.then(function(reg) {
setTimeout(function() {
reg.active.postMessage("cache-all");
}, 60000);
});
}
window.addEventListener("offline", function() {
document.querySelectorAll(".off").forEach(function(el) {
el.style.visibility = "visible";
});
});
window.addEventListener("online", function() {
document.querySelectorAll(".off").forEach(function(el) {
el.style.visibility = "hidden";
});
});
document.querySelector("nav").addEventListener("click", function(e) {
if (e.target === this) { this.classList.toggle("open"); }
});
function _el(tag, cls) {
let e = document.createElement(tag);
if (cls) { e.className = cls; }
return e;
}
function div(cls) { return _el("div", cls); }
function span(cls) { return _el("span", cls); }
function b(cls) { return _el("b", cls); }
function i(cls) { return _el("i", cls); }
function em(cls) { return _el("em", cls); }
function p(cls) { return _el("p", cls); }
function a(cls) { return _el("a", cls); }
function h5(cls) { return _el("h5", cls); }
function h6(cls) { return _el("h6", cls); }
function small(cls) { return _el("small", cls); }
function button(cls) { return _el("button", cls); }
function img(src, title, cls) {
let e = _el("img", cls);
if (src) { e.src = src; }
if (title) { e.alt = title; e.title = title; }
return e;
}
function txt(fn, text, cls) {
let e = fn(cls);
e.textContent = text;
return e;
}
function show(e) { e.classList.remove("hidden"); }
function hide(e) { e.classList.add("hidden"); }
function makeRow(label, value, cls) {
let row = div(cls);
row.append(txt(span, label), txt(b, value));
return row;
}
function parseBr(text, parent) {
let parts = text.split(/<br\s*\/?>/i);
for (let i = 0; i < parts.length; i++) {
if (i > 0) { parent.append(document.createElement("br")); }
parent.append(parts[i]);
}
}
function fmt(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function empty(el) { while (el.firstChild) { el.removeChild(el.firstChild); } }
function actionImg(src, title, action, id, cls) {
let e = img(src, title, cls);
e.setAttribute("data-action", action);
e.setAttribute("data-id", id);
return e;
}
let PRODUCTS={"p1000":{"name":"Erzincan Tulum Cheese 1 kg","price":600,"weight":1000,"img":"erzincan-tulum-peyniri-1000gr.webp"},"p500":{"name":"Erzincan Tulum Cheese 500 gr","price":300,"weight":500,"img":"erzincan-tulum-peyniri-500gr.webp"},"yt900":{"name":"Salted Butter 900 gr","price":580,"weight":900,"img":"tuzlu-tereyagi-900gr.webp"},"y500":{"name":"Unsalted Butter 500 gr","price":290,"weight":500,"img":"tuzsuz-tereyagi-500gr.webp"}};
let BASKET_CONFIG={"warning":"After adding products to your cart,<br/>click the 'Send Order via WhatsApp' button<br/>to quickly submit your order and shipping details,<br/>and easily complete your purchase.","waWarning":"If you don't use WhatsApp,<br/>you can reach us at info@ozumgida.com for orders and inquiries.","shippingWarning":"Free shipping on orders of 15 kg and above.","currency":"₺","waNumber":"905409063518","productsPage":"/pages/urunlerimiz.html","labels":{"addToBasket":"Add to Cart","basket":"Cart","myBasket":"My Cart","itemSuffix":"item(s)","for":"for","openBasket":"Open Cart","closeBasket":"Close Cart","subtotal":"Subtotal","shipping":"Shipping","freeShipping":"Free","total":"Total","delete":"Delete","unit":"Qty","whatsAppOrder":"Send Order via WhatsApp","whatsAppGreeting":"Hello, I would like to place an order:","emptyBasket":"Your cart is empty","productsLinkText":"Our Products","emptyBasketDesc":"page to browse and add products you like."}};
(function() {
let basketSection = document.getElementById("basket");
if (!basketSection) { return; }
let C = BASKET_CONFIG;
let warningText = C.warning || "";
let waWarningText = C.waWarning || "";
let shippingWarningText = C.shippingWarning || "";
let currencySymbol = C.currency || "\u20BA";
let waNumber = C.waNumber || "";
let labels = C.labels || {};
let L = function(k) { return labels[k]; };
let addToBasketText = L("addToBasket");
let badge;
let basketOpen = false;
let navEl;
let emptyEl, descEl, wrapEl, toggleBtnEl, toggleInfoEl, contentEl, itemsEl, totalsEl;
function getCart() {
let params = new URLSearchParams(location.search);
let cart = {};
params.forEach(function(val, key) {
if (PRODUCTS[key]) {
let qty = parseInt(val, 10);
if (qty > 0) { cart[key] = qty; }
}
});
return cart;
}
function setCart(cart) {
let params = new URLSearchParams(location.search);
let toRemove = [];
params.forEach(function(val, key) {
if (PRODUCTS[key]) { toRemove.push(key); }
});
for (let r = 0; r < toRemove.length; r++) params.delete(toRemove[r]);
for (let id in cart) {
if (cart[id] > 0) { params.set(id, cart[id]); }
}
let qs = params.toString();
let url = location.pathname + (qs ? "?" + qs : "") + location.hash;
history.replaceState(null, "", url);
render();
}
function getTotalQty() {
let cart = getCart();
let total = 0;
for (let id in cart) total += cart[id];
return total;
}
function getItems() {
let cart = getCart();
let items = [];
for (let id in cart) {
let prod = PRODUCTS[id];
if (prod) {
items.push({
id: id, name: prod.name, price: prod.price,
weight: prod.weight, img: prod.img, quantity: cart[id]
});
}
}
return items;
}
function addToBasket(id) {
let cart = getCart();
cart[id] = (cart[id] || 0) + 1;
basketOpen = true;
setCart(cart);
}
function updateQty(id, delta) {
let cart = getCart();
let qty = (cart[id] || 0) + delta;
if (qty <= 0) { delete cart[id]; }
else { cart[id] = qty; }
setCart(cart);
}
function removeItem(id) {
let cart = getCart();
delete cart[id];
setCart(cart);
}
function render() {
renderButtons();
renderBadge();
renderBasket();
updateLinks();
}
function renderButtons() {
let cart = getCart();
let buttons = document.querySelectorAll("button[data-id]");
for (let i = 0; i < buttons.length; i++) {
let btn = buttons[i];
let id = btn.getAttribute("data-id");
let qty = cart[id] || 0;
if (qty > 0) {
btn.className = "qty-ctrl";
empty(btn);
let minus = actionImg("/img/minus.png", "-", "minus", id);
let qtyEl = txt(span, qty + " " + L("unit"));
let plus = actionImg("/img/plus.png", "+", "plus", id);
btn.append(minus, qtyEl, plus);
} else {
btn.className = "";
btn.textContent = addToBasketText;
}
}
}
function createBadge() {
badge = a("hidden");
badge.id = "basket-badge";
badge.href = "#basket";
badge.append(img("/img/basket.png", L("basket")), txt(span, "0"));
badge.addEventListener("click", function(e) {
e.preventDefault();
if (getTotalQty() === 0) { return; }
basketOpen = true;
renderBasket();
basketSection.scrollIntoView({ behavior: "smooth" });
});
document.querySelector("header").append(badge);
}
function renderBadge() {
let total = getTotalQty();
badge.querySelector("span").textContent = total;
if (total > 0) { show(badge); }
else { hide(badge); }
}
function updateBadgePosition() {
if (!badge) { return; }
let badgeH = badge.offsetHeight || 80;
if (getTotalQty() === 0) {
badge.style.top = "calc(50% - " + (badgeH / 2) + "px)";
return;
}
let rect = basketSection.getBoundingClientRect();
let badgeTop = rect.top - badgeH / 2;
if (navEl) {
let nc = navEl.getBoundingClientRect().top + navEl.offsetHeight / 2;
if (nc > 0) { badgeTop = Math.min(nc - badgeH / 2, badgeTop); }
}
badgeTop = Math.max(10, Math.min(badgeTop, window.innerHeight - badgeH - 10));
badge.style.top = badgeTop + "px";
}
function initBasketDOM() {
emptyEl = div("empty hidden");
emptyEl.append(img("/img/basket.png", L("basket")), txt(p, L("emptyBasket")));
let descP = p();
let pLink = a();
pLink.href = C.productsPage || "/pages/urunlerimiz.html";
pLink.textContent = L("productsLinkText");
descP.append(pLink, " " + L("emptyBasketDesc"));
emptyEl.append(descP);
basketSection.append(emptyEl);
if (warningText) {
descEl = h5("hidden");
parseBr(warningText, descEl);
basketSection.append(descEl);
}
wrapEl = div("wrap hidden");
toggleBtnEl = button();
toggleInfoEl = i();
toggleBtnEl.append(txt(b, L("basket")), toggleInfoEl, em());
toggleBtnEl.addEventListener("click", function() {
basketOpen = !basketOpen;
if (basketOpen) { show(contentEl); }
else { hide(contentEl); }
toggleBtnEl.classList.toggle("open", basketOpen);
updateBadgePosition();
});
wrapEl.append(toggleBtnEl);
contentEl = div("hidden");
itemsEl = div("items");
totalsEl = div("totals");
contentEl.append(itemsEl, totalsEl);
let waBtn = txt(button, L("whatsAppOrder"), "wa");
waBtn.addEventListener("click", function() {
let items = getItems();
let subtotal = 0;
for (let i = 0; i < items.length; i++) subtotal += items[i].price * items[i].quantity;
let shipping = calculateShippingPrice(items);
let total = subtotal + shipping;
sendWhatsApp(items, subtotal, shipping, total);
});
contentEl.append(waBtn);
if (waWarningText) {
let warn = h6();
parseBr(waWarningText, warn);
contentEl.append(warn);
}
wrapEl.append(contentEl);
basketSection.append(wrapEl);
}
function renderBasket() {
let items = getItems();
if (items.length === 0) {
show(emptyEl);
if (descEl) { hide(descEl); }
hide(wrapEl);
basketOpen = false;
hide(contentEl);
toggleBtnEl.classList.remove("open");
updateBadgePosition();
return;
}
hide(emptyEl);
if (descEl) { show(descEl); }
show(wrapEl);
if (basketOpen) { show(contentEl); }
else { hide(contentEl); }
toggleBtnEl.classList.toggle("open", basketOpen);
empty(itemsEl);
let subtotal = 0;
for (let i = 0; i < items.length; i++) {
let item = items[i];
let lineTotal = item.price * item.quantity;
subtotal += lineTotal;
let row = div();
let del = actionImg("/img/delete.png", L("delete"), "delete", item.id, "del");
let qc = div("qty-ctrl");
let qMinus = actionImg("/img/minus.png", "-", "minus", item.id);
let qPlus = actionImg("/img/plus.png", "+", "plus", item.id);
qc.append(qMinus, txt(span, item.quantity), qPlus);
row.append(del, img("/img/products/" + item.img, item.name), txt(b, item.name), qc, txt(span, fmt(lineTotal) + " " + currencySymbol));
itemsEl.append(row);
}
let totalQty = 0;
for (let q = 0; q < items.length; q++) { totalQty += items[q].quantity; }
toggleInfoEl.textContent = "(" + totalQty + " " + L("itemSuffix") + " " + L("for") + " " + L("total") + " " + fmt(subtotal) + " " + currencySymbol + ")";
empty(totalsEl);
let shipping = calculateShippingPrice(items);
let total = subtotal + shipping;
totalsEl.append(makeRow(L("subtotal") + ":", fmt(subtotal) + " " + currencySymbol));
totalsEl.append(makeRow(L("shipping") + ":", shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")));
if (shippingWarningText) {
totalsEl.append(txt(small, shippingWarningText));
}
totalsEl.append(makeRow(L("total") + ":", fmt(total) + " " + currencySymbol, "total"));
updateBadgePosition();
}
function updateLinks() {
let qs = location.search;
let links = document.querySelectorAll("a[href]");
for (let i = 0; i < links.length; i++) {
let link = links[i];
let href = link.getAttribute("href");
if (!href) { continue; }
if (href.charAt(0) === "#") { continue; }
if (href.indexOf("://") !== -1) { continue; }
if (href.indexOf("mailto:") === 0) { continue; }
if (href.indexOf("tel:") === 0) { continue; }
let hashPos = href.indexOf("#");
let hash = hashPos !== -1 ? href.substring(hashPos) : "";
let base = hashPos !== -1 ? href.substring(0, hashPos) : href;
base = base.split("?")[0];
link.setAttribute("href", base + qs + hash);
}
}
function sendWhatsApp(items, subtotal, shipping, total) {
let msg = L("whatsAppGreeting") + "\n";
for (let i = 0; i < items.length; i++) {
msg += items[i].quantity + "x " + items[i].name + " - " + fmt(items[i].price * items[i].quantity) + " " + currencySymbol + "\n";
}
msg += L("subtotal") + ": " + fmt(subtotal) + " " + currencySymbol + "\n";
msg += L("shipping") + ": " + (shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")) + "\n";
msg += L("total") + ": " + fmt(total) + " " + currencySymbol;
window.open("https://wa.me/" + waNumber + "?text=" + encodeURIComponent(msg), "_blank");
}
document.addEventListener("click", function(e) {
let t = e.target;
if (t.tagName === "IMG" && t.hasAttribute("data-action")) {
e.stopPropagation();
let action = t.getAttribute("data-action");
let id = t.getAttribute("data-id");
if (action === "plus") { updateQty(id, 1); }
else if (action === "minus") { updateQty(id, -1); }
else if (action === "delete") { removeItem(id); }
return;
}
let btn = t;
while (btn && btn.tagName !== "BUTTON") { btn = btn.parentElement; }
if (btn && btn.hasAttribute("data-id") && !btn.classList.contains("qty-ctrl")) {
addToBasket(btn.getAttribute("data-id"));
}
});
createBadge();
navEl = document.querySelector("nav");
let fb = document.querySelector("button[data-id]");
if (fb) { addToBasketText = fb.textContent.trim(); }
initBasketDOM();
if (getTotalQty() > 0) { basketOpen = true; }
render();
window.addEventListener("scroll", updateBadgePosition, { passive: true });
window.addEventListener("resize", updateBadgePosition, { passive: true });
})();
