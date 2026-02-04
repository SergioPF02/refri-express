
const admin = require("firebase-admin");
const path = require('path');
require('dotenv').config(); // Load .env if present

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

console.log("=== DIAGNÓSTICO DE CREDENCIALES FIREBASE ===");
console.log("1. Fecha y Hora del Sistema:", new Date().toString());
console.log("   (IMPORTANTE: Si esta fecha no es correcta, Firebase rechazará el token)");

let serviceAccount = null;
let source = "Ninguna";

// 1. Check Env Var
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("2. Variable de Entorno FIREBASE_SERVICE_ACCOUNT: DETECTADA");
    try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (typeof raw === 'string') {
            serviceAccount = JSON.parse(raw);
            source = "Variable de Entorno (.env o Sistema)";
        } else {
            console.log("   -> El contenido no es string, tipo:", typeof raw);
        }
    } catch (e) {
        console.error("   -> Error al parsear JSON de variable de entorno:", e.message);
    }
} else {
    console.log("2. Variable de Entorno FIREBASE_SERVICE_ACCOUNT: NO DETECTADA");
}

// 2. Check File
if (!serviceAccount) {
    try {
        const fs = require('fs');
        if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            console.log("3. Archivo service-account.json: DETECTADO");
            serviceAccount = require(SERVICE_ACCOUNT_PATH);
            source = "Archivo service-account.json";
        } else {
            console.log("3. Archivo service-account.json: NO ENCONTRADO");
        }
    } catch (e) {
        console.error("   -> Error al leer archivo:", e.message);
    }
} else {
    console.log("3. Archivo service-account.json: OMITIDO (Se usó Variable de Entorno)");
}

console.log("------------------------------------------------");
if (serviceAccount) {
    console.log("FUENTE DE CREDENCIALES USADA:", source);
    console.log("Project ID:", serviceAccount.project_id);
    console.log("Client Email:", serviceAccount.client_email);
    console.log("Private Key ID:", serviceAccount.private_key_id ? serviceAccount.private_key_id.substring(0, 5) + "..." : "DESCONOCIDO");
} else {
    console.error("ERROR: No se encontraron credenciales válidas.");
}
console.log("================================================");
