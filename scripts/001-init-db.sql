-- Initialize the database schema for trips
-- This script creates the necessary tables for the trip visualization app

-- Create Trip table
CREATE TABLE IF NOT EXISTS Trip (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    companions TEXT DEFAULT '[]',
    expenses TEXT DEFAULT '{}',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Destination table
CREATE TABLE IF NOT EXISTS Destination (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    transportationType TEXT,
    "order" INTEGER DEFAULT 0,
    tripId TEXT NOT NULL,
    FOREIGN KEY (tripId) REFERENCES Trip(id) ON DELETE CASCADE
);

-- Create User table for NextAuth
CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    emailVerified DATETIME,
    image TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Account table for NextAuth
CREATE TABLE IF NOT EXISTS Account (
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, providerAccountId),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- Create Session table for NextAuth
CREATE TABLE IF NOT EXISTS Session (
    sessionToken TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expires DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- Create VerificationToken table for NextAuth
CREATE TABLE IF NOT EXISTS VerificationToken (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires DATETIME NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_destination_tripId ON Destination(tripId);
CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId);
CREATE INDEX IF NOT EXISTS idx_account_userId ON Account(userId);
