let token = null;
let sales = [];
let role = null; // Almacenar el rol

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        token = data.token;
        role = data.role;

        // Guardar token y role en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);

        if (role === 'admin') {
            const goToInventory = confirm('Eres administrador. ¿Deseas ir a la gestión de inventarios?');
            if (goToInventory) {
                window.location.href = 'index.html';
                return;
            }
        }

        document.getElementById('login').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        fetchSales();
    } else {
        const errorData = await response.json();
        console.log('Error al iniciar sesión:', errorData);
        alert(`Error al iniciar sesión: ${errorData.error}`);
    }
});

// Verificar si ya hay una sesión activa al cargar la página
window.onload = function() {
    token = localStorage.getItem('token');
    role = localStorage.getItem('role');

    if (token && role) {
        if (role === 'admin') {
            const goToInventory = confirm('Eres administrador. ¿Deseas ir a la gestión de inventarios?');
            if (goToInventory) {
                window.location.href = 'index.html';
                return;
            }
        }

        document.getElementById('login').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        fetchSales();
    }
};

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'menu.html';
}

// Registrar venta
document.getElementById('salesForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const sale = {
        productId: parseInt(document.getElementById('productId').value),
        quantity: parseInt(document.getElementById('quantity').value)
    };

    const response = await fetchWithToken('http://localhost:3000/sales', {
        method: 'POST',
        body: JSON.stringify(sale)
    });

    if (response.ok) {
        sales.push(await response.json());
        fetchSales();
        this.reset();
    } else {
        alert('Error al registrar venta');
    }
});

// Obtener ventas registradas
async function fetchSales() {
    const response = await fetchWithToken('http://localhost:3000/sales');
    sales = await response.json();
    const list = document.getElementById('salesList');
    list.innerHTML = '';
    sales.forEach(sale => {
        const li = document.createElement('li');
        li.textContent = `Producto ID: ${sale.productId} - Cantidad: ${sale.quantity} - Fecha: ${sale.fecha}`;
        list.appendChild(li);
    });
}

// Función auxiliar para fetch con token
// En ventas.js, dentro de la función fetchWithToken
async function fetchWithToken(url, options = {}) {
    console.log('Token enviado:', token); // Depuración
    return fetch(url, {
        ...options,
        headers: { 
            ...options.headers, 
            'Content-Type': 'application/json',
            'Authorization': token 
        }
    });
}