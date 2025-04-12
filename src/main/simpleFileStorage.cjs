// A simple file-based storage solution that doesn't rely on electron-store
// This uses Node.js built-in modules only

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

class SimpleFileStorage {
  constructor(options = {}) {
    this.name = options.name || 'config';
    this.encryptionKey = options.encryptionKey;
    this.data = {};
    
    // Determine the storage file path
    this.filePath = path.join(
      app.getPath('userData'),
      `${this.name}.json`
    );
    
    console.log(`SimpleFileStorage: Using file at ${this.filePath}`);
    
    // Load data if file exists
    this.load();
  }
  
  // Load data from file
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        const decryptedContent = this.decrypt(fileContent);
        this.data = JSON.parse(decryptedContent);
        console.log('SimpleFileStorage: Data loaded successfully');
      } else {
        console.log('SimpleFileStorage: No existing file, creating new store');
        this.data = {};
      }
    } catch (error) {
      console.error('SimpleFileStorage: Error loading data:', error);
      this.data = {};
    }
  }
  
  // Save data to file
  save() {
    try {
      const jsonData = JSON.stringify(this.data, null, 2);
      const encryptedData = this.encrypt(jsonData);
      
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.filePath, encryptedData);
      return true;
    } catch (error) {
      console.error('SimpleFileStorage: Error saving data:', error);
      return false;
    }
  }
  
  // Encrypt data if encryption key is provided
  encrypt(text) {
    if (!this.encryptionKey) return text;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc', 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('SimpleFileStorage: Encryption error:', error);
      return text;
    }
  }
  
  // Decrypt data if encryption key is provided
  decrypt(text) {
    if (!this.encryptionKey || !text.includes(':')) return text;
    
    try {
      const [ivHex, encrypted] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('SimpleFileStorage: Decryption error:', error);
      return text;
    }
  }
  
  // Get a value
  get(key) {
    const parts = key.split('.');
    let current = this.data;
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    
    return current;
  }
  
  // Set a value
  set(key, value) {
    const parts = key.split('.');
    let current = this.data;
    
    // Navigate to the nested object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the value
    current[parts[parts.length - 1]] = value;
    
    // Save to file
    return this.save();
  }
  
  // Check if a key exists
  has(key) {
    return this.get(key) !== undefined;
  }
  
  // Delete a key
  delete(key) {
    const parts = key.split('.');
    let current = this.data;
    
    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    
    // Delete the property
    if (current !== undefined && current !== null) {
      delete current[parts[parts.length - 1]];
      return this.save();
    }
    
    return false;
  }
}

module.exports = SimpleFileStorage;
