import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { JWT_SECRET } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, phone } = req.body;

        // Basic Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        // Prevent Admin Registration
        if (role === 'admin') {
            return res.status(403).json({ error: "No es posible registrarse como administrador." });
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Formato de correo inválido" });
        }

        // Password Validation
        if (password.length < 8) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone",
            [name, email, hashedPassword, role, phone || null]
        );

        // Generate Token
        const user = newUser.rows[0];
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ ...user, token });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Compare password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const { id, name, role } = user.rows[0];

        // Generate Token
        const token = jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ id, name, email, role, token });

    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
