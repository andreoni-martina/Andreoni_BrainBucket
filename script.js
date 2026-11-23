/* Brain Bucket — carrito y checkout (simulación, sin cobro real) */
(function () {
  "use strict";
  var CART_KEY = "bb-cart";

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCount(cart);
  }
  function cartCount(cart) { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartTotal(cart) { return cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0); }
  function fmt(n) { return "$" + n.toLocaleString("es-AR"); }

  function updateCount(cart) {
    cart = cart || getCart();
    var n = cartCount(cart);
    document.querySelectorAll(".cart-count").forEach(function (el) { el.textContent = n; });
  }

  /* ───── Diálogo del carrito ───── */
  var dialog = document.createElement("dialog");
  dialog.id = "cart-dialog";
  dialog.innerHTML =
    '<div class="cart-head">' +
    '<h2 class="cond">TU <span class="g">CARRITO</span></h2>' +
    '<button type="button" class="cart-close" aria-label="Cerrar carrito">✕</button>' +
    "</div>" +
    '<p class="cart-added" hidden></p>' +
    '<div class="cart-items"></div>' +
    '<div class="cart-total"><span>Total</span><strong class="cond g"></strong></div>' +
    '<div class="cart-actions">' +
    '<button type="button" class="btn btn-outline cond cart-continue">SEGUIR COMPRANDO</button>' +
    '<a class="btn btn-green cond cart-pay" href="pago.html">PAGAR</a>' +
    "</div>";
  document.body.appendChild(dialog);

  var itemsBox = dialog.querySelector(".cart-items");
  var totalEl = dialog.querySelector(".cart-total strong");
  var addedMsg = dialog.querySelector(".cart-added");
  var payBtn = dialog.querySelector(".cart-pay");

  function renderCart() {
    var cart = getCart();
    if (!cart.length) {
      itemsBox.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
      payBtn.classList.add("disabled");
    } else {
      payBtn.classList.remove("disabled");
      itemsBox.innerHTML = cart.map(function (item, i) {
        return (
          '<div class="cart-item">' +
          '<img src="' + item.img + '" alt="">' +
          '<div class="cart-item-info"><p>' + item.name + "</p><small>" + fmt(item.price) + " c/u</small></div>" +
          '<div class="qty">' +
          '<button type="button" data-i="' + i + '" data-act="dec" aria-label="Quitar uno">−</button>' +
          "<span>" + item.qty + "</span>" +
          '<button type="button" data-i="' + i + '" data-act="inc" aria-label="Agregar uno">+</button>' +
          "</div>" +
          '<strong class="cond">' + fmt(item.price * item.qty) + "</strong>" +
          '<button type="button" class="rm" data-i="' + i + '" data-act="rm" aria-label="Eliminar producto">✕</button>' +
          "</div>"
        );
      }).join("");
    }
    totalEl.textContent = fmt(cartTotal(cart));
  }

  function openCart(message) {
    if (message) { addedMsg.textContent = message; addedMsg.hidden = false; }
    else { addedMsg.hidden = true; }
    renderCart();
    if (!dialog.open) dialog.showModal();
  }

  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) { dialog.close(); return; }
    var actBtn = e.target.closest("[data-act]");
    if (actBtn) {
      var cart = getCart();
      var i = +actBtn.dataset.i;
      if (actBtn.dataset.act === "inc") cart[i].qty++;
      if (actBtn.dataset.act === "dec") { cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); }
      if (actBtn.dataset.act === "rm") cart.splice(i, 1);
      saveCart(cart);
      addedMsg.hidden = true;
      renderCart();
      return;
    }
    if (e.target.closest(".cart-close") || e.target.closest(".cart-continue")) dialog.close();
    if (e.target.closest(".cart-pay") && !getCart().length) e.preventDefault();
  });

  document.querySelectorAll(".open-cart").forEach(function (b) {
    b.addEventListener("click", function () { openCart(); });
  });

  /* ───── Agregar al carrito ───── */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".add-cart");
    if (!btn) return;
    var card = btn.closest(".card");
    var name = card.querySelector("h3").textContent.trim();
    var price = parseInt(card.querySelector(".price").textContent.replace(/\D/g, ""), 10);
    var img = card.querySelector(".card-img img").src;
    var cart = getCart();
    var found = cart.find(function (i) { return i.name === name; });
    if (found) found.qty++;
    else cart.push({ name: name, price: price, img: img, qty: 1 });
    saveCart(cart);
    openCart("Agregado al carrito: " + name);
  });

  /* ───── Buscador del catálogo ───── */
  var search = document.getElementById("buscar");
  if (search) {
    var norm = function (s) {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };
    search.addEventListener("input", function () {
      var q = norm(search.value.trim());
      document.querySelectorAll(".grid .card").forEach(function (card) {
        var text = norm(card.textContent);
        card.style.display = !q || text.indexOf(q) !== -1 ? "" : "none";
      });
    });
  }

  /* ───── Formularios de contacto y newsletter ───── */
  [["contact-form", "contact-ok"], ["news-form", "news-ok"]].forEach(function (pair) {
    var frm = document.getElementById(pair[0]);
    var ok = document.getElementById(pair[1]);
    if (!frm) return;
    frm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!frm.checkValidity()) { frm.reportValidity(); return; }
      frm.reset();
      ok.hidden = false;
    });
    frm.addEventListener("input", function () { ok.hidden = true; });
  });

  /* ───── Checkout (pago.html) ───── */
  var checkout = document.getElementById("checkout");
  if (checkout) {
    var summary = document.getElementById("summary-items");
    var sumTotal = document.getElementById("summary-total");
    var form = document.getElementById("pay-form");
    var success = document.getElementById("success");
    var cart = getCart();

    var listHTML = function (items) {
      return items.map(function (item) {
        return (
          '<div class="sum-item">' +
          '<img src="' + item.img + '" alt="">' +
          "<div><p>" + item.name + "</p><small>" + item.qty + " × " + fmt(item.price) + "</small></div>" +
          '<strong class="cond">' + fmt(item.qty * item.price) + "</strong></div>"
        );
      }).join("");
    };

    if (!cart.length) {
      checkout.querySelector(".checkout-grid").hidden = true;
      document.getElementById("empty-cart").hidden = false;
    } else {
      summary.innerHTML = listHTML(cart);
      sumTotal.textContent = fmt(cartTotal(cart));
    }

    // Mostrar los campos del método elegido y hacerlos obligatorios
    form.querySelectorAll('input[name="pay"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        document.getElementById("tarjeta-fields").hidden = radio.value !== "tarjeta";
        document.getElementById("billetera-fields").hidden = radio.value !== "billetera";
        document.querySelectorAll("#tarjeta-fields input").forEach(function (inp) {
          inp.required = radio.value === "tarjeta";
        });
        document.querySelectorAll("#billetera-fields input, #billetera-fields select").forEach(function (inp) {
          inp.required = radio.value === "billetera";
        });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var method = form.querySelector('input[name="pay"]:checked');
      var purchased = getCart();
      document.getElementById("success-items").innerHTML = listHTML(purchased);
      document.getElementById("success-total").textContent = fmt(cartTotal(purchased));
      document.getElementById("success-method").textContent =
        method.value === "tarjeta" ? "Tarjeta de crédito / débito" : "Billetera virtual";
      saveCart([]);
      checkout.querySelector(".checkout-grid").hidden = true;
      checkout.querySelector(".checkout-head").hidden = true;
      success.hidden = false;
      window.scrollTo(0, 0);
    });
  }

  updateCount();
})();
