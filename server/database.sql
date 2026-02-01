CREATE DATABASE refri_express;

-- Connect to the database before running these
-- \c refri_express

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, hash this!
    role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'worker')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255), -- Link by email for simplicity in MVP, ideally user_id
    service VARCHAR(100) NOT NULL,
    tonnage NUMERIC(3,1),
    price NUMERIC(10,2),
    date DATE,
    time TIME,
    address TEXT,
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    name VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
