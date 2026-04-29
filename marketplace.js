// marketplace.js (actualizado con envío a WhatsApp + servidor local)

window.ZONA_PRODUCTS = [
    { id: 1, name: "Audífonos Bluetooth", price: 25.00, icon: "fas fa-headphones", color: "#1e6f5c", description: "Audífonos inalámbricos con sonido envolvente y batería de 20 horas. Compatibles con todos los dispositivos." },
    { id: 2, name: "Cargador Rápido 20W", price: 12.00, icon: "fas fa-bolt", color: "#e67e22", description: "Cargador de pared tipo USB-C con carga rápida Power Delivery. Incluye protección contra sobrecargas." },
    { id: 3, name: "Smartphone Básico", price: 180.00, icon: "fas fa-mobile-alt", color: "#2c3e50", description: "Teléfono inteligente con pantalla HD, 64GB de almacenamiento y cámara dual. Ideal para uso diario." },
    { id: 4, name: "Bocina Portátil", price: 35.00, img: "https://tse1.mm.bing.net/th/id/OIP.a1QiySREjxPnekNsBlrnOQHaHa?pid=Api&P=0&h=180", description: "Bocina Bluetooth resistente al agua, sonido potente y batería de 10 horas. Conecta hasta 3 dispositivos." },
    { id: 5, name: "MicroSD 64GB", price: 15.00, icon: "fas fa-sd-card", color: "#8e44ad", description: "Tarjeta de memoria clase 10, ideal para fotos, videos y aplicaciones. Velocidad de lectura hasta 100MB/s." },
    { id: 6, name: "Cable USB-C 2m", price: 6.00, icon: "fas fa-plug", color: "#7f8c8d", description: "Cable trenzado de 2 metros, resistente a enredos. Carga rápida y transferencia de datos." },
    { id: 7, name: "Audífonos Diadema", price: 42.00, icon: "fas fa-head-side-headphones", color: "#d35400", description: "Audífonos over-ear con almohadillas suaves, sonido estéreo y micrófono incorporado." },
    { id: 8, name: "Funda Protectora", price: 8.00, icon: "fas fa-mobile", color: "#3498db", description: "Funda de silicona transparente, resistente a golpes y caídas. Diseño delgado y antideslizante." },
    { id: 9, name: "Mouse Inalámbrico", price: 18.00, img: "https://tse1.mm.bing.net/th/id/OIP.a1QiySREjxPnekNsBlrnOQHaHa?pid=Api&P=0&h=180", description: "Mouse ergonómico con conectividad 2.4GHz, silencioso y con DPI ajustable." }
];

const products = window.ZONA_PRODUCTS;
const WHATSAPP_NUMBER = '5350383829'; // Número de WhatsApp de Zona Pixel

let cart = [];

function loadCart() {
    const saved = localStorage.getItem("marketplaceCart");
    if (saved) {
        try { cart = JSON.parse(saved); } catch(e) { cart = []; }
    }
    renderCart();
}
function saveCart() {
    localStorage.setItem("marketplaceCart", JSON.stringify(cart));
}

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    renderCart();
}

function debounce(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedUpdate = debounce((id, newQty) => {
    if (newQty <= 0) {
        cart = cart.filter(item => item.id !== id);
    } else {
        const item = cart.find(item => item.id === id);
        if (item) item.quantity = newQty;
    }
    saveCart();
    renderCart();
}, 300);

function updateQuantity(id, newQty) {
    debouncedUpdate(id, newQty);
}

function removeItem(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

function getTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    grid.innerHTML = products.map(prod => {
        const mediaContent = prod.img 
            ? `<img src="${prod.img}" alt="${prod.name}" loading="lazy" width="110" height="110">`
            : `<i class="${prod.icon}" style="color: ${prod.color};"></i>`;
        return `
            <div class="product-card" data-id="${prod.id}">
                <div class="product-img">
                    ${mediaContent}
                </div>
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <div class="price">$${prod.price.toFixed(2)}</div>
                    <button class="add-btn" data-id="${prod.id}"><i class="fas fa-cart-plus"></i> Agregar</button>
                </div>
            </div>
        `;
    }).join("");
    
    document.querySelectorAll(".product-card").forEach(card => {
        card.addEventListener("click", (e) => {
            if (e.target.closest(".add-btn")) return;
            const id = parseInt(card.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) openModal(product);
        });
    });
    
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) addToCart(product);
        });
    });
}

const modal = document.getElementById("productModal");
const closeModal = document.querySelector(".close-modal");
let currentProduct = null;

function openModal(product) {
    currentProduct = product;
    const modalImgContainer = document.getElementById("modalImgContainer");
    modalImgContainer.innerHTML = product.img 
        ? `<img src="${product.img}" alt="${product.name}" loading="lazy">`
        : `<i class="${product.icon}" style="font-size: 4rem; color: ${product.color};"></i>`;
    
    document.getElementById("modalName").innerText = product.name;
    document.getElementById("modalPrice").innerHTML = `$${product.price.toFixed(2)}`;
    document.getElementById("modalDesc").innerText = product.description || "Producto de alta calidad, ideal para tus necesidades tecnológicas.";
    modal.style.display = "flex";
}

function closeModalFn() {
    modal.style.display = "none";
}
closeModal.addEventListener("click", closeModalFn);
window.addEventListener("click", (e) => {
    if (e.target === modal) closeModalFn();
});

document.getElementById("modalAddToCart").addEventListener("click", () => {
    if (currentProduct) {
        addToCart(currentProduct);
        closeModalFn();
        alert("Producto agregado al carrito");
    }
});

function renderCart() {
    const cartContainer = document.getElementById("cartContainer");
    const totalSpan = document.getElementById("cartTotal");
    if (!cartContainer) return;
    
    if (cart.length === 0) {
        cartContainer.innerHTML = `<div class="empty-cart"><i class="fas fa-bag-shopping"></i> El carrito está vacío.</div>`;
        if (totalSpan) totalSpan.innerHTML = "";
        return;
    }
    
    cartContainer.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => {
                const mediaSmall = item.img 
                    ? `<img src="${item.img}" alt="${item.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 8px;" loading="lazy">`
                    : `<i class="${item.icon}" style="font-size: 1.2rem; color: ${item.color};"></i>`;
                return `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-icon">${mediaSmall}</div>
                            <div class="cart-item-details">
                                <div class="cart-item-name">${item.name}</div>
                                <div class="cart-item-price">$${item.price.toFixed(2)} c/u</div>
                            </div>
                        </div>
                        <div class="cart-item-controls">
                            <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-qty">
                            <button class="remove-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    const total = getTotal();
    if (totalSpan) totalSpan.innerHTML = `<i class="fas fa-calculator"></i> Total: $${total.toFixed(2)}`;
    
    document.querySelectorAll(".cart-qty").forEach(input => {
        input.addEventListener("input", (e) => {
            const id = parseInt(input.dataset.id);
            let newQty = parseInt(input.value);
            if (isNaN(newQty) || newQty < 1) newQty = 1;
            updateQuantity(id, newQty);
        });
    });
    
    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            removeItem(id);
        });
    });
}

// Nueva función para enviar el pedido por WhatsApp
function enviarWhatsApp(pedido) {
    const { nombre, telefono, direccion, productos, total } = pedido;
    
    // Construir el texto del mensaje
    let mensaje = `🛒 *NUEVO PEDIDO - ZONA PIXEL* 🛒\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n`;
    mensaje += `📞 *Teléfono:* ${telefono}\n`;
    mensaje += `📍 *Dirección:* ${direccion}\n\n`;
    mensaje += `📦 *Productos:*\n`;
    
    productos.forEach((prod, index) => {
        mensaje += `  ${index + 1}. ${prod.nombre} x${prod.cantidad} - $${prod.subtotal.toFixed(2)}\n`;
    });
    
    mensaje += `\n💰 *Total: $${total.toFixed(2)}*\n`;
    mensaje += `📅 *Fecha:* ${new Date().toLocaleString()}\n`;
    mensaje += `\n✅ ¡Gracias por tu compra!`;
    
    // Codificar para URL
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    
    // Abrir en nueva pestaña
    window.open(url, '_blank');
}

async function sendOrder(event) {
    event.preventDefault();
    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    if (!nombre || !telefono || !direccion) {
        alert("❌ Completa todos los datos del formulario.");
        return;
    }
    if (cart.length === 0) {
        alert("🛒 El carrito está vacío. Agrega productos.");
        return;
    }

    // Construir detalle de productos
    const productosDetalle = cart.map(item => ({
        nombre: item.name,
        cantidad: item.quantity,
        precioUnitario: item.price,
        subtotal: item.price * item.quantity
    }));

    const total = getTotal();

    const pedido = {
        nombre,
        telefono,
        direccion,
        productos: productosDetalle,
        total
    };

    let servidorOk = false;

    try {
        // Intentar enviar al servidor local
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });

        if (response.ok) {
            const data = await response.json();
            alert(`✅ ¡Pedido #${data.orderId} registrado correctamente! Ahora se abrirá WhatsApp para confirmar.`);
            servidorOk = true;
        } else {
            const error = await response.json();
            alert(`⚠️ El servidor respondió con error: ${error.error || 'desconocido'}. Se enviará solo por WhatsApp.`);
        }
    } catch (error) {
        console.error(error);
        alert("⚠️ No se pudo conectar con el servidor local. El pedido se enviará solo por WhatsApp.");
    }

    // Siempre enviar por WhatsApp
    enviarWhatsApp(pedido);

    // Limpiar carrito y formulario
    cart = [];
    saveCart();
    renderCart();
    document.getElementById("orderForm").reset();
    
    if (!servidorOk) {
        // Si el servidor falló, dar un mensaje adicional
        console.log("Pedido enviado solo por WhatsApp debido a falta de servidor.");
    }
}

function init() {
    renderProducts();
    loadCart();
    document.getElementById("orderForm").addEventListener("submit", sendOrder);
}

init();