const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const API_URL = 'https://refri-express-api.onrender.com';

async function runTest() {
    console.log("🔍 Iniciando Diagnóstico desde SERVER...");

    // 1. Check Env
    console.log("1. DATABASE_URL:", process.env.DATABASE_URL ? "OK" : "MISSING");

    if (!process.env.DATABASE_URL) return;

    // 2. Connector
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("2. Conectando a DB...");
        await client.connect();
        console.log("✅ DB Conectada.");

        // 2b Check users
        const res = await client.query("SELECT count(*) FROM users");
        console.log(`ℹ️ Usuarios actuales: ${res.rows[0].count}`);

    } catch (err) {
        console.error("❌ Error DB:", err.message);
    } finally {
        await client.end();
    }

    // 3. API
    console.log("\n3. Probando API (Registro)...");
    try {
        const testUser = {
            name: "Test Server Debug",
            email: `server_test_${Date.now()}@example.com`,
            password: "password123",
            role: "client"
        };

        console.log(`POST ${API_URL}/api/auth/register`);
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Body:", text);

    } catch (err) {
        console.error("❌ Error API:", err.message);
    }
}

runTest();
