import pg from 'pg';
const { Client } = pg;
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const API_URL = 'https://refri-express-api.onrender.com'; // Hardcoded based on assumption

async function runTest() {
    console.log("🔍 Iniciando Diagnóstico...");
    console.log("1. Verificando Variables de Entorno...");
    if (!process.env.DATABASE_URL) {
        console.error("❌ FALTA DATABASE_URL en server/.env");
        return;
    }
    console.log("✅ DATABASE_URL detectada.");

    // 1. Test DB Connection directly
    console.log("\n2. Probando Conexión Directa a Base de Datos...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Conexión a DB Exitosa.");

        // Check if users table exists
        const resTables = await client.query("SELECT to_regclass('public.users');");
        if (resTables.rows[0].to_regclass) {
            console.log("✅ Tabla 'users' existe.");
        } else {
            console.error("❌ Tabla 'users' NO existe.");
        }

        // Try to select users
        const resUsers = await client.query("SELECT count(*) FROM users");
        console.log(`ℹ️ Hay ${resUsers.rows[0].count} usuarios en la DB.`);

    } catch (err) {
        console.error("❌ Error conectando a DB:", err.message);
    } finally {
        await client.end();
    }

    // 2. Test API Register
    console.log("\n3. Probando Endpoint de Registro (API)...");
    try {
        const testUser = {
            name: "Test Debug",
            email: `test_${Date.now()}@example.com`,
            password: "password123",
            role: "client"
        };

        console.log(`Intentando registrar: ${testUser.email} en ${API_URL}`);

        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        const status = response.status;
        const text = await response.text();

        console.log(`Status Code: ${status}`);
        console.log(`Response Body: ${text}`);

        if (status === 200) {
            console.log("✅ Registro vía API Exitoso.");
        } else {
            console.error("❌ Registro vía API Falló.");
        }

    } catch (err) {
        console.error("❌ Error llamando a API:", err.message);
    }
}

runTest();
