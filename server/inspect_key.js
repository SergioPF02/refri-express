
const serviceAccount = require('./service-account.json');

console.log("=== DIAGNÓSTICO DE CLAVE PRIVADA ===");
const key = serviceAccount.private_key;
if (!key) {
    console.error("ERROR: No 'private_key' found in JSON.");
} else {
    console.log("Length:", key.length);
    console.log("Starts with correct header:", key.startsWith("-----BEGIN PRIVATE KEY-----"));
    console.log("Ends with correct footer:", key.includes("-----END PRIVATE KEY-----"));
    console.log("Contains actual newlines (\\n):", key.includes("\n"));
    console.log("Contains escaped newlines (\\\\n):", key.includes("\\n")); // Should be false if loaded via require and it was proper JSON

    // Print first 50 chars to see formatting (safe)
    console.log("Preview (First 50 chars):", key.substring(0, 50));
}
console.log("====================================");
