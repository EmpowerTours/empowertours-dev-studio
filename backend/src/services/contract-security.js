'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Severity constants
// ---------------------------------------------------------------------------
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

// ---------------------------------------------------------------------------
// Source-code scanning patterns
// ---------------------------------------------------------------------------
const SOURCE_PATTERNS = [
  // ---- CRITICAL ----
  {
    severity: SEVERITY.CRITICAL,
    id: 'SELFDESTRUCT',
    pattern: /\bselfdestruct\s*\(/g,
    message: 'selfdestruct detected \u2013 contract can be permanently destroyed',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'SUICIDE',
    pattern: /\bsuicide\s*\(/g,
    message: 'suicide (deprecated selfdestruct alias) detected',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'DELEGATECALL',
    pattern: /\.delegatecall\s*\(/g,
    message: 'delegatecall detected \u2013 arbitrary code execution risk',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'CALLCODE',
    pattern: /\.callcode\s*\(/g,
    message: 'callcode detected \u2013 deprecated and dangerous',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'ERC1967_PROXY',
    pattern: /\bERC1967\b/g,
    message: 'ERC1967 proxy pattern detected \u2013 upgradeable proxy infrastructure',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'UUPS_PROXY',
    pattern: /\bUUPS\b/g,
    message: 'UUPS upgradeable proxy pattern detected',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'TRANSPARENT_PROXY',
    pattern: /\bTransparentProxy\b/g,
    message: 'TransparentProxy pattern detected \u2013 upgradeable proxy infrastructure',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'PROXY_IMPORT',
    pattern: /import\s+.*['"\/].*Proxy['"]/g,
    message: 'Proxy import detected \u2013 contract may be upgradeable',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'PROXY_INHERITANCE',
    pattern: /\bis\s+[^{]*Proxy\b/g,
    message: 'Proxy inheritance detected \u2013 contract may be upgradeable',
  },
  {
    severity: SEVERITY.CRITICAL,
    id: 'UPGRADEABLE_IMPORT',
    pattern: /import\s+.*['"\/].*Upgradeable['"]/g,
    message: 'Upgradeable import detected \u2013 contract uses upgradeable pattern',
  },

  // ---- WARNING ----
  {
    severity: SEVERITY.WARNING,
    id: 'TX_ORIGIN',
    pattern: /\btx\.origin\b/g,
    message: 'tx.origin used for authorization \u2013 phishing vulnerability',
  },
  {
    severity: SEVERITY.WARNING,
    id: 'ASSEMBLY_CREATE2',
    pattern: /assembly\s*\{[^}]*\bcreate2\b[^}]*\}/gs,
    message: 'assembly create2 detected \u2013 may enable deterministic deployment tricks',
  },
];

// ---------------------------------------------------------------------------
// Helper: check for missing ReentrancyGuard when external calls are present
// ---------------------------------------------------------------------------
function checkReentrancy(code) {
  const hasExternalCall =
    /\.call\s*[\({]/g.test(code) ||
    /\.send\s*\(/g.test(code) ||
    /\.transfer\s*\(/g.test(code);

  const hasReentrancyGuard = /ReentrancyGuard/g.test(code);

  if (hasExternalCall && !hasReentrancyGuard) {
    return {
      severity: SEVERITY.WARNING,
      id: 'MISSING_REENTRANCY_GUARD',
      message:
        'External calls detected without ReentrancyGuard \u2013 potential reentrancy vulnerability',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: extract Solidity version info
// ---------------------------------------------------------------------------
function extractSolidityVersion(code) {
  const findings = [];

  const pragmaMatch = code.match(/pragma\s+solidity\s+([^;]+);/);
  if (pragmaMatch) {
    const versionConstraint = pragmaMatch[1].trim();
    findings.push({
      severity: SEVERITY.INFO,
      id: 'SOLIDITY_VERSION',
      message: `Solidity version detected: ${versionConstraint}`,
    });

    // Check if the version is >= 0.8.20
    const versionNumbers = versionConstraint.match(/(\d+)\.(\d+)\.(\d+)/);
    if (versionNumbers) {
      const major = parseInt(versionNumbers[1], 10);
      const minor = parseInt(versionNumbers[2], 10);
      const patch = parseInt(versionNumbers[3], 10);

      if (
        major > 0 ||
        (major === 0 && minor > 8) ||
        (major === 0 && minor === 8 && patch >= 20)
      ) {
        findings.push({
          severity: SEVERITY.INFO,
          id: 'SOLIDITY_VERSION_OK',
          message: `Solidity version ${major}.${minor}.${patch} meets minimum requirement (>= 0.8.20)`,
        });
      } else {
        findings.push({
          severity: SEVERITY.WARNING,
          id: 'SOLIDITY_VERSION_LOW',
          message: `Solidity version ${major}.${minor}.${patch} is below recommended minimum 0.8.20`,
        });
      }
    }
  } else {
    findings.push({
      severity: SEVERITY.WARNING,
      id: 'NO_PRAGMA',
      message: 'No pragma solidity directive found',
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Helper: contract size heuristic (source-level)
// ---------------------------------------------------------------------------
function estimateContractSize(code) {
  // Rough heuristic: count non-whitespace, non-comment characters as a proxy
  const stripped = code
    .replace(/\/\/.*$/gm, '')   // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // multi-line comments
    .replace(/\s+/g, '');

  const estimatedBytes = stripped.length;

  // EIP-170 limit is 24576 bytes of *bytecode*, but we can flag very large source
  if (estimatedBytes > 24576) {
    return {
      severity: SEVERITY.INFO,
      id: 'LARGE_CONTRACT_SOURCE',
      message: `Contract source is large (${estimatedBytes} chars stripped) \u2013 compiled bytecode may exceed EIP-170 24576-byte limit`,
    };
  }
  return {
    severity: SEVERITY.INFO,
    id: 'CONTRACT_SIZE_OK',
    message: `Contract source size estimate: ${estimatedBytes} chars stripped`,
  };
}

// ---------------------------------------------------------------------------
// 1. scanSourceCode
// ---------------------------------------------------------------------------
/**
 * Scan Solidity source code for forbidden / risky patterns.
 *
 * @param {string} code - Solidity source code
 * @returns {{ passed: boolean, critical: object[], warnings: object[], info: object[], scanType: string, timestamp: string, score: number }}
 */
function scanSourceCode(code) {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return {
      passed: false,
      critical: [{ severity: SEVERITY.CRITICAL, id: 'EMPTY_SOURCE', message: 'No source code provided' }],
      warnings: [],
      info: [],
      scanType: 'source',
      timestamp: new Date().toISOString(),
      score: 0,
    };
  }

  const critical = [];
  const warnings = [];
  const info = [];

  // Run regex-based pattern detection
  for (const entry of SOURCE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    entry.pattern.lastIndex = 0;

    if (entry.pattern.test(code)) {
      const finding = {
        severity: entry.severity,
        id: entry.id,
        message: entry.message,
      };

      switch (entry.severity) {
        case SEVERITY.CRITICAL:
          critical.push(finding);
          break;
        case SEVERITY.WARNING:
          warnings.push(finding);
          break;
        case SEVERITY.INFO:
          info.push(finding);
          break;
      }
    }
  }

  // Reentrancy check
  const reentrancyFinding = checkReentrancy(code);
  if (reentrancyFinding) {
    warnings.push(reentrancyFinding);
  }

  // Solidity version checks
  const versionFindings = extractSolidityVersion(code);
  for (const f of versionFindings) {
    if (f.severity === SEVERITY.INFO) info.push(f);
    else if (f.severity === SEVERITY.WARNING) warnings.push(f);
    else if (f.severity === SEVERITY.CRITICAL) critical.push(f);
  }

  // Contract size heuristic
  const sizeFinding = estimateContractSize(code);
  if (sizeFinding.severity === SEVERITY.INFO) info.push(sizeFinding);
  else if (sizeFinding.severity === SEVERITY.WARNING) warnings.push(sizeFinding);

  const allFindings = [...critical, ...warnings, ...info];
  const score = computeSecurityScore(allFindings);
  const passed = critical.length === 0;

  return {
    passed,
    critical,
    warnings,
    info,
    scanType: 'source',
    timestamp: new Date().toISOString(),
    score,
  };
}

// ---------------------------------------------------------------------------
// 2. scanBytecode
// ---------------------------------------------------------------------------

// Opcodes that are PUSH instructions: PUSH1 (0x60) through PUSH32 (0x7F)
// Each PUSHn pushes n bytes of immediate data that must be skipped.
const PUSH1 = 0x60;
const PUSH32 = 0x7f;

// Dangerous opcodes
const OP_SELFDESTRUCT = 0xff;
const OP_DELEGATECALL = 0xf4;
const OP_CALLCODE = 0xf2;

/**
 * Context-aware bytecode opcode walk. Skips PUSH immediate data bytes so that
 * data is not misinterpreted as opcodes.
 *
 * @param {string} bytecode - Hex-encoded bytecode (with or without 0x prefix)
 * @returns {{ passed: boolean, critical: object[], warnings: object[], info: object[], scanType: string, timestamp: string, score: number }}
 */
function scanBytecode(bytecode) {
  if (typeof bytecode !== 'string' || bytecode.trim().length === 0) {
    return {
      passed: false,
      critical: [{ severity: SEVERITY.CRITICAL, id: 'EMPTY_BYTECODE', message: 'No bytecode provided' }],
      warnings: [],
      info: [],
      scanType: 'bytecode',
      timestamp: new Date().toISOString(),
      score: 0,
    };
  }

  // Normalize: strip 0x prefix and whitespace
  let hex = bytecode.trim();
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  }

  // Validate hex
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    return {
      passed: false,
      critical: [{ severity: SEVERITY.CRITICAL, id: 'INVALID_BYTECODE', message: 'Bytecode contains invalid hex characters' }],
      warnings: [],
      info: [],
      scanType: 'bytecode',
      timestamp: new Date().toISOString(),
      score: 0,
    };
  }

  const bytes = Buffer.from(hex, 'hex');
  const byteLength = bytes.length;

  const critical = [];
  const warnings = [];
  const info = [];

  // EIP-170 contract size check: max 24576 bytes
  if (byteLength > 24576) {
    critical.push({
      severity: SEVERITY.CRITICAL,
      id: 'EIP170_EXCEEDED',
      message: `Bytecode size (${byteLength} bytes) exceeds EIP-170 limit of 24576 bytes`,
    });
  } else {
    info.push({
      severity: SEVERITY.INFO,
      id: 'BYTECODE_SIZE',
      message: `Bytecode size: ${byteLength} bytes (limit: 24576)`,
    });
  }

  // Context-aware opcode walk
  let i = 0;
  while (i < byteLength) {
    const opcode = bytes[i];

    // Check for dangerous opcodes
    if (opcode === OP_SELFDESTRUCT) {
      critical.push({
        severity: SEVERITY.CRITICAL,
        id: 'SELFDESTRUCT_OPCODE',
        message: `SELFDESTRUCT opcode (0xFF) found at byte offset ${i}`,
      });
    } else if (opcode === OP_DELEGATECALL) {
      critical.push({
        severity: SEVERITY.CRITICAL,
        id: 'DELEGATECALL_OPCODE',
        message: `DELEGATECALL opcode (0xF4) found at byte offset ${i}`,
      });
    } else if (opcode === OP_CALLCODE) {
      critical.push({
        severity: SEVERITY.CRITICAL,
        id: 'CALLCODE_OPCODE',
        message: `CALLCODE opcode (0xF2) found at byte offset ${i}`,
      });
    }

    // If this is a PUSHn instruction, skip the n immediate data bytes
    if (opcode >= PUSH1 && opcode <= PUSH32) {
      const pushSize = opcode - PUSH1 + 1; // PUSH1 = 1 byte, PUSH32 = 32 bytes
      i += 1 + pushSize; // skip opcode + data bytes
    } else {
      i += 1;
    }
  }

  const allFindings = [...critical, ...warnings, ...info];
  const score = computeSecurityScore(allFindings);
  const passed = critical.length === 0;

  return {
    passed,
    critical,
    warnings,
    info,
    scanType: 'bytecode',
    timestamp: new Date().toISOString(),
    score,
  };
}

// ---------------------------------------------------------------------------
// 3. createIntegrityHash
// ---------------------------------------------------------------------------
/**
 * Create SHA-256 integrity hashes for source code and bytecode.
 *
 * @param {string} source   - Solidity source code
 * @param {string} bytecode - Hex-encoded bytecode
 * @returns {{ sourceHash: string, bytecodeHash: string, combinedHash: string }}
 */
function createIntegrityHash(source, bytecode) {
  const sourceNormalized = typeof source === 'string' ? source : '';
  const bytecodeNormalized = typeof bytecode === 'string' ? bytecode : '';

  const sourceHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(sourceNormalized)
      .digest('hex');

  const bytecodeHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(bytecodeNormalized)
      .digest('hex');

  const combinedHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(sourceNormalized + bytecodeNormalized)
      .digest('hex');

  return {
    sourceHash,
    bytecodeHash,
    combinedHash,
  };
}

// ---------------------------------------------------------------------------
// 4. computeSecurityScore
// ---------------------------------------------------------------------------
/**
 * Compute a security score from an array of findings.
 * Starts at 100 and deducts per-severity:
 *   CRITICAL: -50
 *   WARNING:  -10
 *   INFO:      -2
 * Result is clamped to [0, 100].
 *
 * @param {object[]} findings - Array of { severity, ... } finding objects
 * @returns {number}
 */
function computeSecurityScore(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return 100;
  }

  let score = 100;

  for (const finding of findings) {
    switch (finding.severity) {
      case SEVERITY.CRITICAL:
        score -= 50;
        break;
      case SEVERITY.WARNING:
        score -= 10;
        break;
      case SEVERITY.INFO:
        score -= 2;
        break;
      default:
        break;
    }
  }

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  scanSourceCode,
  scanBytecode,
  createIntegrityHash,
  computeSecurityScore,
};
