const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path'); // Importar el módulo path
const app = express();
const port = 3000;


app.use(cors());
app.use(express.json());

const SECRET_KEY = 'xyz_secret_key';



// Servir archivos estáticos (index.html, ventas.html, menu.html, etc.)
app.use(express.static(path.join(__dirname, '.')));

// Redirigir la ruta raíz (/) a menu.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});
// Conexión a la base de datos SQLite
const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite.');
});

// Función para ejecutar consultas de manera asíncrona
const runAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Función para inicializar la base de datos
const bcrypt = require('bcrypt');
const saltRounds = 10;

const initializeDatabase = async () => {
    try {
        // Crear tabla de productos
        await runAsync(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            categoria TEXT,
            cantidad INTEGER,
            precioCompra REAL,
            precioVenta REAL,
            stockMinimo INTEGER
        )`);

        // Crear tabla de movimientos
        await runAsync(`CREATE TABLE IF NOT EXISTS movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER,
            tipo TEXT,
            cantidad INTEGER,
            fecha TEXT,
            FOREIGN KEY (productId) REFERENCES products(id)
        )`);

        // Crear tabla de ventas
        await runAsync(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER,
            quantity INTEGER,
            fecha TEXT,
            FOREIGN KEY (productId) REFERENCES products(id)
        )`);

        // Crear tabla de usuarios
        await runAsync(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        // Verificar si hay usuarios y crear usuarios de prueba si no existen
        const row = await getAsync(`SELECT COUNT(*) as count FROM users`);
        if (row.count === 0) {
            const adminPassword = await bcrypt.hash('1234', saltRounds);
            const vendedorPassword = await bcrypt.hash('vendedor123', saltRounds);
            await runAsync(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', adminPassword, 'admin']);
            await runAsync(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['vendedor', vendedorPassword, 'vendedor']);
            console.log('Usuarios de prueba creados: admin (admin) y vendedor (vendedor).');
        } else {
            console.log('Ya existen usuarios en la base de datos. No se crearon usuarios de prueba.');
        }
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err.message);
        process.exit(1);
    }
};

// Inicializar la base de datos antes de definir las rutas
initializeDatabase().then(() => {
    // Middleware para verificar token
    function authenticateToken(req, res, next) {
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ error: 'Acceso denegado' });
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) return res.status(403).json({ error: 'Token inválido' });
            req.user = user;
            next();
        });
    }

    // Middleware para restringir por rol
    function restrictTo(roles) {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'No tienes permiso para acceder a esta ruta' });
            }
            next();
        };
    }

// Actualizar el endpoint /login
// Login
const bcrypt = require('bcrypt');

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Intento de login:', { username, password });
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            return res.status(500).json({ error: 'Error en el servidor' });
        }
        if (!user) {
            console.log('Usuario no encontrado:', { username });
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (err || !result) {
                console.log('Contraseña incorrecta para usuario:', { username });
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }
            console.log('Usuario autenticado:', user);
            const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token, role: user.role });
        });
    });
});

    // Rutas protegidas
    app.post('/products', authenticateToken, restrictTo(['admin']), (req, res) => {
        const { nombre, categoria, cantidad, precioCompra, precioVenta, stockMinimo } = req.body;
        const sql = `INSERT INTO products (nombre, categoria, cantidad, precioCompra, precioVenta, stockMinimo) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [nombre, categoria, cantidad, precioCompra, precioVenta, stockMinimo], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const productId = this.lastID;
            db.run(`INSERT INTO movements (productId, tipo, cantidad, fecha) VALUES (?, ?, ?, ?)`, 
                   [productId, 'Entrada', cantidad, new Date().toISOString()]);
            res.status(201).json({ id: productId, ...req.body });
        });
    });

    app.get('/products', authenticateToken, restrictTo(['admin', 'vendedor']), (req, res) => {
        db.all(`SELECT * FROM products`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.get('/movements', authenticateToken, restrictTo(['admin']), (req, res) => {
        db.all(`SELECT m.*, p.nombre FROM movements m JOIN products p ON m.productId = p.id`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post('/sales', authenticateToken, restrictTo(['admin', 'vendedor']), (req, res) => {
        const { productId, quantity } = req.body;
        db.get(`SELECT cantidad FROM products WHERE id = ?`, [productId], (err, row) => {
            if (err || !row) return res.status(400).json({ error: 'Producto no encontrado' });
            if (row.cantidad < quantity) return res.status(400).json({ error: 'Stock insuficiente' });

            db.run(`INSERT INTO sales (productId, quantity, fecha) VALUES (?, ?, ?)`, 
                   [productId, quantity, new Date().toISOString()], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const saleId = this.lastID;
                db.run(`UPDATE products SET cantidad = cantidad - ? WHERE id = ?`, [quantity, productId]);
                db.run(`INSERT INTO movements (productId, tipo, cantidad, fecha) VALUES (?, ?, ?, ?)`, 
                       [productId, 'Salida', quantity, new Date().toISOString()]);
                res.status(201).json({ id: saleId, productId, quantity, fecha: new Date().toISOString() });
            });
        });
    });

    app.get('/sales', authenticateToken, restrictTo(['admin', 'vendedor']), (req, res) => {
        db.all(`SELECT * FROM sales`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post('/sync-sales', authenticateToken, restrictTo(['admin']), (req, res) => {
        db.all(`SELECT * FROM sales WHERE synced = 0 OR synced IS NULL`, [], (err, sales) => {
            if (err) return res.status(500).json({ error: err.message });
            for (const sale of sales) {
                db.run(`UPDATE products SET cantidad = cantidad - ? WHERE id = ?`, [sale.quantity, sale.productId]);
                db.run(`INSERT INTO movements (productId, tipo, cantidad, fecha) VALUES (?, ?, ?, ?)`, 
                       [sale.productId, 'Salida', sale.quantity, sale.fecha]);
                db.run(`UPDATE sales SET synced = 1 WHERE id = ?`, [sale.id]);
            }
            res.json({ message: 'Ventas sincronizadas' });
        });
    });

    // Iniciar el servidor después de inicializar la base de datos
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1);
});