const solc = require('solc');
const path = require('path');

class CompileService {
  constructor() {
    console.log('✅ Compile Service initialized');
  }

  /**
   * Compile Solidity source code
   * @param {object} contracts Object with filename: sourceCode pairs
   * @returns {object} Compiled contracts with bytecode and ABI
   */
  compileContracts(contracts) {
    try {
      // Prepare input for solc
      const input = {
        language: 'Solidity',
        sources: {},
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.gasEstimates']
            }
          }
        }
      };

      // Add all contract sources
      for (const [filename, source] of Object.entries(contracts)) {
        input.sources[filename] = {
          content: source
        };
      }

      console.log('🔨 Compiling contracts:', Object.keys(contracts));

      // Compile
      const output = JSON.parse(
        solc.compile(JSON.stringify(input), {
          import: this.findImports
        })
      );

      // Check for errors
      if (output.errors) {
        const errors = output.errors.filter(error => error.severity === 'error');
        if (errors.length > 0) {
          console.error('❌ Compilation errors:', errors);
          throw new Error(
            'Compilation failed:\n' +
            errors.map(e => `${e.formattedMessage}`).join('\n')
          );
        }

        // Log warnings
        const warnings = output.errors.filter(error => error.severity === 'warning');
        if (warnings.length > 0) {
          console.warn('⚠️  Compilation warnings:', warnings.length);
        }
      }

      // Extract compiled contracts
      const compiled = {};

      for (const sourceFile in output.contracts) {
        for (const contractName in output.contracts[sourceFile]) {
          const contract = output.contracts[sourceFile][contractName];

          compiled[contractName] = {
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            deployedBytecode: contract.evm.deployedBytecode.object,
            gasEstimates: contract.evm.gasEstimates,
            source: sourceFile
          };

          console.log(`✅ Compiled ${contractName}:`, {
            bytecodeSize: contract.evm.bytecode.object.length / 2,
            abiSize: contract.abi.length
          });
        }
      }

      return {
        success: true,
        contracts: compiled,
        warnings: output.errors?.filter(e => e.severity === 'warning') || []
      };

    } catch (error) {
      console.error('❌ Compilation error:', error);
      throw error;
    }
  }

  /**
   * Import resolver for OpenZeppelin and other dependencies
   */
  findImports(importPath) {
    try {
      // Handle OpenZeppelin imports
      if (importPath.startsWith('@openzeppelin/')) {
        const contractPath = importPath.replace('@openzeppelin/', '');
        const fullPath = path.join(
          __dirname,
          '..',
          '..',
          'node_modules',
          '@openzeppelin',
          contractPath
        );

        const fs = require('fs');
        if (fs.existsSync(fullPath)) {
          const contents = fs.readFileSync(fullPath, 'utf8');
          return { contents };
        }
      }

      // Handle other imports
      console.warn('⚠️  Import not found:', importPath);
      return { error: 'Import not found: ' + importPath };

    } catch (error) {
      console.error('Error resolving import:', importPath, error);
      return { error: 'Failed to resolve import: ' + importPath };
    }
  }

  /**
   * Estimate deployment gas
   */
  estimateGas(bytecode) {
    // Base deployment cost + bytecode cost
    const baseGas = 21000;
    const bytecodeGas = (bytecode.length / 2) * 200; // ~200 gas per byte

    return Math.ceil(baseGas + bytecodeGas);
  }

  /**
   * Validate contract before compilation
   */
  validateContract(sourceCode) {
    const errors = [];

    // Check for SPDX license
    if (!sourceCode.includes('SPDX-License-Identifier')) {
      errors.push('Missing SPDX-License-Identifier');
    }

    // Check for pragma
    if (!sourceCode.includes('pragma solidity')) {
      errors.push('Missing pragma solidity statement');
    }

    // Check for contract definition
    if (!sourceCode.match(/contract\s+\w+/)) {
      errors.push('No contract definition found');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let compileService = null;

module.exports = {
  getCompileService: () => {
    if (!compileService) {
      compileService = new CompileService();
    }
    return compileService;
  },
  CompileService
};
