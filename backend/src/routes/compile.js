const express = require('express');
const router = express.Router();
const { getCompileService } = require('../services/compileService');
const { scanSourceCode, scanBytecode, createIntegrityHash, computeSecurityScore } = require('../services/contract-security');

/**
 * POST /api/compile
 * Compile Solidity contracts
 */
router.post('/', async (req, res) => {
  try {
    const { contracts } = req.body;

    if (!contracts || typeof contracts !== 'object') {
      return res.status(400).json({
        error: 'Contracts object required',
        example: {
          contracts: {
            'MyContract.sol': 'pragma solidity ^0.8.20; contract MyContract { ... }'
          }
        }
      });
    }

    // Validate contracts
    const compileService = getCompileService();
    const validationErrors = [];

    for (const [filename, source] of Object.entries(contracts)) {
      const validation = compileService.validateContract(source);
      if (!validation.valid) {
        validationErrors.push({
          file: filename,
          errors: validation.errors
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Contract validation failed',
        details: validationErrors
      });
    }

    console.log('📦 Compiling', Object.keys(contracts).length, 'contract(s)...');

    // Compile
    const result = compileService.compileContracts(contracts);

    if (!result.success) {
      return res.status(400).json({
        error: 'Compilation failed',
        details: result.errors
      });
    }

    // Calculate gas estimates for deployment
    const gasEstimates = {};
    for (const [name, contract] of Object.entries(result.contracts)) {
      gasEstimates[name] = compileService.estimateGas(contract.bytecode);
    }

    // Security scanning on source and bytecode
    const allSource = Object.values(contracts).join('\n');
    const sourceReport = scanSourceCode(allSource);

    const contractNames = Object.keys(result.contracts);
    const mainContract = result.contracts[contractNames[0]];
    const bytecodeReport = mainContract ? scanBytecode(mainContract.bytecode) : null;

    const integrityHashes = mainContract
      ? createIntegrityHash(allSource, mainContract.bytecode)
      : null;

    const securityScore = bytecodeReport
      ? Math.round((sourceReport.score + bytecodeReport.score) / 2)
      : sourceReport.score;

    res.json({
      success: true,
      contracts: result.contracts,
      gasEstimates,
      warnings: result.warnings,
      securityReport: {
        source: sourceReport,
        bytecode: bytecodeReport,
      },
      integrityHashes,
      securityScore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Compilation error:', error);
    res.status(500).json({
      error: error.message || 'Compilation failed',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

/**
 * POST /api/compile/validate
 * Validate contract without compiling
 */
router.post('/validate', async (req, res) => {
  try {
    const { source } = req.body;

    if (!source) {
      return res.status(400).json({ error: 'Source code required' });
    }

    const compileService = getCompileService();
    const validation = compileService.validateContract(source);

    res.json({
      success: validation.valid,
      errors: validation.errors
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

module.exports = router;
