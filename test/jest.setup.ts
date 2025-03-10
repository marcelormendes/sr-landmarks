// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
}

// Patch NestJS Logger prototype 
import { Logger } from '@nestjs/common';
const originalLogger = Logger;

// Save original methods
const originalLoggerProto = {
  log: originalLogger.prototype.log,
  error: originalLogger.prototype.error,
  warn: originalLogger.prototype.warn,
  debug: originalLogger.prototype.debug,
  verbose: originalLogger.prototype.verbose,
};

const originalLoggerStatic = {
  log: originalLogger.log,
  error: originalLogger.error,
  warn: originalLogger.warn,
  debug: originalLogger.debug,
  verbose: originalLogger.verbose,
};

// Silence console output during tests
beforeAll(() => {
  // Mock Console
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  
  // Mock NestJS Logger instance methods
  originalLogger.prototype.log = jest.fn();
  originalLogger.prototype.error = jest.fn();
  originalLogger.prototype.warn = jest.fn();
  originalLogger.prototype.debug = jest.fn();
  originalLogger.prototype.verbose = jest.fn();
  
  // Mock NestJS Logger static methods
  originalLogger.log = jest.fn();
  originalLogger.error = jest.fn();
  originalLogger.warn = jest.fn();
  originalLogger.debug = jest.fn();
  originalLogger.verbose = jest.fn();
})

// Restore console output after tests
afterAll(() => {
  jest.restoreAllMocks();
  
  // Restore NestJS Logger instance methods
  originalLogger.prototype.log = originalLoggerProto.log;
  originalLogger.prototype.error = originalLoggerProto.error;
  originalLogger.prototype.warn = originalLoggerProto.warn;
  originalLogger.prototype.debug = originalLoggerProto.debug;
  originalLogger.prototype.verbose = originalLoggerProto.verbose;
  
  // Restore NestJS Logger static methods
  originalLogger.log = originalLoggerStatic.log;
  originalLogger.error = originalLoggerStatic.error;
  originalLogger.warn = originalLoggerStatic.warn;
  originalLogger.debug = originalLoggerStatic.debug;
  originalLogger.verbose = originalLoggerStatic.verbose;
})