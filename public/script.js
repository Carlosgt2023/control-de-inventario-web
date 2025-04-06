let token = null;
let inventory = [];
let movements = [];

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
}

// Manejar el login
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

        if (role !== 'admin') {
            alert('Acceso denegado. Redirigiendo a la página de ventas...');
            window.location.href = 'ventas.html';
            return;
        }

        document.getElementById('login').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        updateInventoryTable();
        fetchMovements();
        showSection('registro');
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
        if (role !== 'admin') {
            alert('Acceso denegado. Redirigiendo a la página de ventas...');
            window.location.href = 'ventas.html';
            return;
        }

        document.getElementById('login').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        updateInventoryTable();
        fetchMovements();
        showSection('registro');
    }
};

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'menu.html';
}

// Registrar producto
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const product = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        cantidad: parseInt(document.getElementById('cantidad').value),
        precioCompra: parseFloat(document.getElementById('precioCompra').value),
        precioVenta: parseFloat(document.getElementById('precioVenta').value),
        stockMinimo: parseInt(document.getElementById('stockMinimo').value)
    };

    const response = await fetchWithToken('http://localhost:3000/products', {
        method: 'POST',
        body: JSON.stringify(product)
    });

    if (response.ok) {
        const newProduct = await response.json();
        inventory.push(newProduct);
        checkLowStock(newProduct);
        updateInventoryTable();
        fetchMovements();
        this.reset();
    }
});

// Actualizar tabla de existencias
async function updateInventoryTable() {
    const response = await fetchWithToken('http://localhost:3000/products');
    inventory = await response.json();
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    inventory.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.nombre}</td>
            <td>${product.cantidad}</td>
            <td>${product.stockMinimo}</td>
            <td>${product.cantidad <= product.stockMinimo ? 'Bajo Stock' : 'Normal'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Verificar bajo stock
function checkLowStock(product) {
    if (product.cantidad <= product.stockMinimo) {
        alert(`Alerta: El producto ${product.nombre} tiene bajo stock (${product.cantidad} unidades).`);
    }
}

// Obtener historial de movimientos
async function fetchMovements() {
    const response = await fetchWithToken('http://localhost:3000/movements');
    movements = await response.json();
    const list = document.getElementById('movementList');
    list.innerHTML = '';
    movements.forEach(movement => {
        const li = document.createElement('li');
        li.textContent = `${movement.nombre} - ${movement.tipo}: ${movement.cantidad} unidades (${movement.fecha})`;
        list.appendChild(li);
    });
}

// Generar reporte
async function generateReport() {
    const response = await fetchWithToken('http://localhost:3000/products');
    const products = await response.json();
    const reportOutput = document.getElementById('reportOutput');
    reportOutput.innerHTML = 'Reporte de Inventario:<br>' + 
        products.map(p => `${p.nombre}: ${p.cantidad} unidades`).join('<br>');
}

// Sincronizar ventas
async function syncSales() {
    const response = await fetchWithToken('http://localhost:3000/sync-sales', {
        method: 'POST'
    });

    if (response.ok) {
        const data = await response.json();
        alert(data.message); // Mostrar mensaje de éxito
        updateInventoryTable(); // Actualizar existencias
        fetchMovements(); // Actualizar historial
    } else {
        alert('Error al sincronizar ventas');
    }
}

// Función auxiliar para fetch con token
async function fetchWithToken(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: { 
            ...options.headers, 
            'Content-Type': 'application/json',
            'Authorization': token 
        }
    });
}

// Actualizar tabla de existencias
async function updateInventoryTable() {
    const response = await fetchWithToken('http://localhost:3000/products');
    inventory = await response.json();
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    inventory.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td> <!-- Mostrar el ID -->
            <td>${product.nombre}</td>
            <td>${product.cantidad}</td>
            <td>${product.stockMinimo}</td>
            <td>${product.cantidad <= product.stockMinimo ? 'Bajo Stock' : 'Normal'}</td>
        `;
        tbody.appendChild(row);
    });
}