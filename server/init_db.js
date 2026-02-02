const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const DB_CONFIG = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
};

const DB_NAME = 'refri_express';

async function setup() {
    console.log('🔄 Iniciando configuración de base de datos...');

    // 1. Crear base de datos si no existe
    const client = new Client({ ...DB_CONFIG, database: 'postgres' });
    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`✨ Creando base de datos '${DB_NAME}'...`);
            await client.query(`CREATE DATABASE "${DB_NAME}"`);
        } else {
            console.log(`ℹ️ La base de datos '${DB_NAME}' ya existe.`);
        }
    } catch (err) {
        console.error('❌ Error verificando/creando base de datos:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Ejecutar esquema base
    const dbClient = new Client({ ...DB_CONFIG, database: DB_NAME });
    try {
        await dbClient.connect();

        const sqlPath = path.join(__dirname, 'database.sql');
        let sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Eliminar líneas de CREATE DATABASE y \c que podrían causar error aquí
        sqlContent = sqlContent.replace(/CREATE DATABASE.*;/i, '')
            .replace(/\\c.*;/i, '');

        console.log('📜 Ejecutando esquema base (database.sql)...');
        await dbClient.query(sqlContent);
        console.log('✅ Esquema base aplicado.');

    } catch (err) {
        // Ignorar errores de "tabla ya existe" para ser idempotente
        if (err.code === '42P07') {
            console.log('⚠️ Algunas tablas ya existían (error ignorado).');
        } else {
            console.error('❌ Error aplicando esquema:', err.message);
        }
    } finally {
        await dbClient.end();
    }

    // 3. Correr migraciones
    console.log('🚀 Ejecutando migraciones...');
    const files = fs.readdirSync(__dirname).filter(f => f.startsWith('migration_') && f.endsWith('.js'));

    for (const file of files) {
        console.log(`   Running ${file}...`);
        await new Promise((resolve, reject) => {
            exec(`node ${file}`, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Error en ${file}:`, stderr);
                    // No fallamos el proceso completo, intentamos la siguiente
                } else {
                    console.log(stdout.trim());
                }
                resolve();
            });
        });
    }

    console.log('🏁 ¡Configuración de base de datos completada!');
}

setup();
