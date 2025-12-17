// ============ Configuration ============

const CONFIG = {
    MONAD_TESTNET: {
        chainId: '0x279f', // 10143
        chainName: 'Monad Testnet',
        rpcUrl: 'https://rpc-testnet.monadinfra.com/',
        explorerUrl: 'https://testnet.monadscan.com',
        nativeCurrency: {
            name: 'MON',
            symbol: 'MON',
            decimals: 18
        }
    },
    MONAD_MAINNET: {
        chainId: '0x8f', // 143
        chainName: 'Monad Mainnet',
        rpcUrl: 'https://rpc.monad.xyz',
        explorerUrl: 'https://monadscan.com',
        nativeCurrency: {
            name: 'MON',
            symbol: 'MON',
            decimals: 18
        }
    },
    // Testnet deployment
    CONTRACT_ADDRESS: '0xDC323606208B6687523E228Ee8ce41728c15caDC',
    NETWORK_TYPE: 'testnet' // Change to 'mainnet' for production
};

// ============ Contract ABI ============

const CONTRACT_ABI = [
    "function proposePartnership(string memory _termsHash, string memory _equityDocumentHash) external payable",
    "function proposeSettlement(string memory _termsHash) external payable",
    "function acceptAgreement() external",
    "function terminateAgreement(string memory _reason) external",
    "function initiateSettlementWithdrawal() external",
    "function withdraw() external",
    "function cancelProposal() external",
    "function getAgreementDetails() external view returns (uint256 nonce, uint8 agreementType, uint8 status, address rumbleAddress, uint256 amount, uint256 proposalTimestamp, uint256 acceptanceTimestamp, string memory termsHash, bool fundsLocked)",
    "function getEquityDetails() external view returns (uint256 percentage, string memory documentHash, uint256 grantedAt, bool active, bool nonForfeitable, string memory equityClass, string memory equityRights)",
    "function getPendingWithdrawal(address account) external view returns (uint256)",
    "function getBalance() external view returns (uint256)",
    "function getWithdrawalTimelock() external view returns (uint256)",
    "function CREATOR() external view returns (address)",
    "function agreementNonce() external view returns (uint256)",
    "function PARTNERSHIP_BOND() external view returns (uint256)",
    "function SETTLEMENT_AMOUNT() external view returns (uint256)",
    "function PARTNERSHIP_EQUITY() external view returns (uint256)",
    "function hasActiveEquity() external view returns (bool)",
    "event AgreementProposed(uint256 indexed nonce, uint8 agreementType, address indexed rumbleAddress, uint256 amount, string termsHash, uint256 timestamp)",
    "event PartnershipProposed(uint256 indexed nonce, address indexed rumbleAddress, uint256 bondAmount, uint256 equityPercentage, string equityDocument, string equityRights, uint256 timestamp)",
    "event AgreementAccepted(uint256 indexed nonce, uint8 agreementType, address indexed rumbleAddress, uint256 acceptanceTimestamp)",
    "event EquityGranted(uint256 indexed nonce, address indexed beneficiary, uint256 equityPercentage, bool nonForfeitable, string equityClass, string equityRights, uint256 timestamp)"
];

// ============ State ============

let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let currentNetwork = CONFIG.NETWORK_TYPE === 'mainnet' ? CONFIG.MONAD_MAINNET : CONFIG.MONAD_TESTNET;

// ============ DOM Elements ============

const connectBtn = document.getElementById('connectBtn');
const optionsSection = document.getElementById('optionsSection');
const walletAddress = document.getElementById('walletAddress');
const networkIndicator = document.getElementById('networkIndicator');
const networkName = document.getElementById('networkName');
const proposePartnershipBtn = document.getElementById('proposePartnershipBtn');
const proposeSettlementBtn = document.getElementById('proposeSettlementBtn');
const partnershipTermsInput = document.getElementById('partnershipTerms');
const partnershipEquityInput = document.getElementById('partnershipEquity');
const settlementTermsInput = document.getElementById('settlementTerms');
const statusCard = document.getElementById('statusCard');
const contractAddressEl = document.getElementById('contractAddress');
const creatorAddressEl = document.getElementById('creatorAddress');
const agreementNonceEl = document.getElementById('agreementNonce');
const contractBalanceEl = document.getElementById('contractBalance');

// ============ Initialization ============

document.addEventListener('DOMContentLoaded', async () => {
    // Check if ethers loaded
    if (typeof ethers === 'undefined') {
        showToast('Failed to load Web3 library. Please refresh the page.', 'error');
        statusCard.innerHTML = '<div class="status-loading" style="color: var(--danger);">Failed to load Web3 library</div>';
        return;
    }

    // Check if MetaMask installed
    if (typeof window.ethereum === 'undefined') {
        showToast('Please install MetaMask to use this dApp', 'error');
        connectBtn.disabled = true;
        statusCard.innerHTML = '<div class="status-loading">Connect wallet to view agreement status</div>';
        return;
    }

    // Display contract address or warning
    if (CONFIG.CONTRACT_ADDRESS === 'DEPLOY_CONTRACT_FIRST') {
        contractAddressEl.innerHTML = '<span class="placeholder" style="color: var(--warning);">⚠️ Contract not deployed yet</span>';
        showToast('Contract not deployed. Deploy contract first before using.', 'error');
        statusCard.innerHTML = '<div class="status-loading" style="color: var(--danger);">Contract not deployed</div>';
    } else {
        contractAddressEl.textContent = CONFIG.CONTRACT_ADDRESS;
        // Set initial loading state
        statusCard.innerHTML = '<div class="status-loading">Connect wallet to view agreement status</div>';
    }

    // Check if already connected
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        await connectWallet();
    }

    // Event listeners
    connectBtn.addEventListener('click', connectWallet);
    proposePartnershipBtn.addEventListener('click', proposePartnership);
    proposeSettlementBtn.addEventListener('click', proposeSettlement);

    // Security notice
    console.log('%c⚠️ SECURITY WARNING', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%cNever share your private keys. This dApp only requests signatures, never private keys.', 'color: orange; font-size: 14px;');
});

// ============ Wallet Connection ============

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showToast('Please install MetaMask!', 'error');
        return;
    }

    try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        currentAccount = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        const expectedChainId = parseInt(currentNetwork.chainId, 16);

        if (network.chainId !== expectedChainId) {
            await switchNetwork();
            return;
        }

        // Initialize contract if deployed
        if (CONFIG.CONTRACT_ADDRESS !== 'DEPLOY_CONTRACT_FIRST') {
            contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            await loadContractData();
            await loadAgreementStatus();
        }

        // Update UI
        updateUIConnected();
        showToast('Wallet connected successfully! 🎉', 'success');

    } catch (error) {
        console.error('Connection failed:', error);
        showToast('Failed to connect: ' + error.message, 'error');
    }
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: currentNetwork.chainId }],
        });

        setTimeout(connectWallet, 500);

    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: currentNetwork.chainId,
                        chainName: currentNetwork.chainName,
                        nativeCurrency: currentNetwork.nativeCurrency,
                        rpcUrls: [currentNetwork.rpcUrl],
                        blockExplorerUrls: [currentNetwork.explorerUrl]
                    }]
                });
                setTimeout(connectWallet, 500);
            } catch (addError) {
                showToast('Failed to add network', 'error');
            }
        } else {
            showToast('Failed to switch network', 'error');
        }
    }
}

function updateUIConnected() {
    walletAddress.textContent = `Connected: ${formatAddress(currentAccount)}`;
    networkName.textContent = currentNetwork.chainName;
    networkIndicator.querySelector('.status-dot').classList.add('connected');
    connectBtn.textContent = 'Connected ✓';
    connectBtn.disabled = true;

    if (CONFIG.CONTRACT_ADDRESS !== 'DEPLOY_CONTRACT_FIRST') {
        optionsSection.style.display = 'block';
    }
}

// ============ Contract Interaction ============

async function loadContractData() {
    try {
        const creator = await contract.CREATOR();
        const nonce = await contract.agreementNonce();
        const balance = await contract.getBalance();
        const partnershipBond = await contract.PARTNERSHIP_BOND();
        const settlementAmount = await contract.SETTLEMENT_AMOUNT();
        const equityPercentage = await contract.PARTNERSHIP_EQUITY();

        creatorAddressEl.textContent = formatAddress(creator);
        agreementNonceEl.textContent = nonce.toString();
        contractBalanceEl.textContent = `${ethers.utils.formatEther(balance)} MON`;

        // Update UI with correct amounts
        document.querySelector('.option-card.partnership .amount').textContent =
            `${ethers.utils.formatEther(partnershipBond)} MON`;
        document.querySelector('.option-card.settlement .amount').textContent =
            `${ethers.utils.formatEther(settlementAmount)} MON`;

        // Update equity display
        const equityPercent = ethers.utils.formatUnits(equityPercentage, 2);
        const partnershipList = document.querySelector('.option-card.partnership .benefits-list');
        if (partnershipList) {
            const firstItem = partnershipList.querySelector('li');
            firstItem.textContent = `✓ ${equityPercent}% fully diluted equity (non-forfeitable)`;
        }

    } catch (error) {
        console.error('Failed to load contract data:', error);
        showToast('Failed to load contract data', 'error');
    }
}

async function loadAgreementStatus() {
    try {
        const details = await contract.getAgreementDetails();
        const [nonce, agreementType, status, rumbleAddr, amount, proposalTime, acceptanceTime, termsHash, fundsLocked] = details;

        if (status === 0) { // NONE
            statusCard.innerHTML = `
                <div class="status-loading">
                    No active agreement. Rumble can propose partnership or settlement above.
                </div>
            `;
            return;
        }

        const typeNames = ['None', 'Partnership', 'Settlement'];
        const statusNames = ['None', 'Pending', 'Active', 'Terminated'];
        const statusClasses = ['none', 'pending', 'active', 'terminated'];

        let equityInfo = '';
        if (agreementType === 1) { // Partnership
            const equityDetails = await contract.getEquityDetails();
            const equityPercent = ethers.utils.formatUnits(equityDetails[0], 2);
            equityInfo = `
                <div class="status-item">
                    <span class="status-label">Equity Grant</span>
                    <span class="status-value">${equityPercent}% (${equityDetails[3] ? '✅ Active' : '❌ Inactive'})</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Equity Class</span>
                    <span class="status-value" style="font-size: 11px;">${equityDetails[5]}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Equity Rights</span>
                    <span class="status-value" style="font-size: 11px;">${equityDetails[6]}</span>
                </div>
            `;
        }

        statusCard.innerHTML = `
            <div class="status-item">
                <span class="status-label">Agreement Type</span>
                <span class="status-value">${typeNames[agreementType]}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Status</span>
                <span class="status-badge ${statusClasses[status]}">${statusNames[status]}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Rumble Address</span>
                <span class="status-value">${formatAddress(rumbleAddr)}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Amount Locked</span>
                <span class="status-value">${ethers.utils.formatEther(amount)} MON</span>
            </div>
            ${equityInfo}
            <div class="status-item">
                <span class="status-label">Proposed</span>
                <span class="status-value">${new Date(proposalTime * 1000).toLocaleString()}</span>
            </div>
            ${acceptanceTime > 0 ? `
            <div class="status-item">
                <span class="status-label">Accepted</span>
                <span class="status-value">${new Date(acceptanceTime * 1000).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="status-item">
                <span class="status-label">Terms Hash (IPFS)</span>
                <span class="status-value" style="font-size: 11px; word-break: break-all;">${termsHash}</span>
            </div>
        `;

        // Check for pending withdrawals
        const pendingWithdrawal = await contract.getPendingWithdrawal(currentAccount);
        if (pendingWithdrawal.gt(0)) {
            const withdrawBtn = document.createElement('button');
            withdrawBtn.className = 'btn-primary btn-block';
            withdrawBtn.style.marginTop = '20px';
            withdrawBtn.textContent = `💰 Withdraw ${ethers.utils.formatEther(pendingWithdrawal)} MON`;
            withdrawBtn.onclick = withdrawFunds;
            statusCard.appendChild(withdrawBtn);
        }

    } catch (error) {
        console.error('Failed to load status:', error);
        statusCard.innerHTML = `
            <div class="status-loading" style="color: var(--danger);">
                Failed to load status. Contract may not be deployed.
            </div>
        `;
    }
}

// ============ Propose Partnership ============

async function proposePartnership() {
    const termsHash = partnershipTermsInput.value.trim();
    const equityHash = partnershipEquityInput.value.trim();

    // Input validation
    if (!termsHash || !equityHash) {
        showToast('Please provide both IPFS hashes', 'error');
        return;
    }

    if (!termsHash.startsWith('Qm') || !equityHash.startsWith('Qm')) {
        showToast('Invalid IPFS hash format (should start with Qm)', 'error');
        return;
    }

    if (!contract) {
        showToast('Contract not connected', 'error');
        return;
    }

    try {
        proposePartnershipBtn.disabled = true;
        proposePartnershipBtn.textContent = 'Proposing...';

        const partnershipBond = await contract.PARTNERSHIP_BOND();

        showToast('Please confirm transaction in MetaMask...', 'info');

        const tx = await contract.proposePartnership(termsHash, equityHash, {
            value: partnershipBond
        });

        showToast('Transaction submitted! Waiting for confirmation...', 'success');

        await tx.wait();

        showToast('✅ Partnership proposed successfully!', 'success');
        partnershipTermsInput.value = '';
        partnershipEquityInput.value = '';

        // Reload data
        await loadContractData();
        await loadAgreementStatus();

    } catch (error) {
        console.error('Failed to propose partnership:', error);
        let errorMsg = 'Failed to propose partnership';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.message) {
            errorMsg = error.message.substring(0, 100);
        }
        showToast(errorMsg, 'error');
    } finally {
        proposePartnershipBtn.disabled = false;
        proposePartnershipBtn.textContent = 'Propose Partnership';
    }
}

// ============ Propose Settlement ============

async function proposeSettlement() {
    const termsHash = settlementTermsInput.value.trim();

    if (!termsHash) {
        showToast('Please provide IPFS terms hash', 'error');
        return;
    }

    if (!termsHash.startsWith('Qm')) {
        showToast('Invalid IPFS hash format (should start with Qm)', 'error');
        return;
    }

    if (!contract) {
        showToast('Contract not connected', 'error');
        return;
    }

    try {
        proposeSettlementBtn.disabled = true;
        proposeSettlementBtn.textContent = 'Proposing...';

        const settlementAmount = await contract.SETTLEMENT_AMOUNT();

        showToast('Please confirm transaction in MetaMask...', 'info');

        const tx = await contract.proposeSettlement(termsHash, {
            value: settlementAmount
        });

        showToast('Transaction submitted! Waiting for confirmation...', 'success');

        await tx.wait();

        showToast('✅ Settlement proposed successfully!', 'success');
        settlementTermsInput.value = '';

        // Reload data
        await loadContractData();
        await loadAgreementStatus();

    } catch (error) {
        console.error('Failed to propose settlement:', error);
        let errorMsg = 'Failed to propose settlement';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.message) {
            errorMsg = error.message.substring(0, 100);
        }
        showToast(errorMsg, 'error');
    } finally {
        proposeSettlementBtn.disabled = false;
        proposeSettlementBtn.textContent = 'Propose Settlement';
    }
}

// ============ Withdraw Funds ============

async function withdrawFunds() {
    try {
        const tx = await contract.withdraw();
        showToast('Withdrawal submitted! Waiting for confirmation...', 'success');

        await tx.wait();

        showToast('✅ Funds withdrawn successfully!', 'success');

        await loadContractData();
        await loadAgreementStatus();

    } catch (error) {
        console.error('Withdrawal failed:', error);
        showToast('Withdrawal failed: ' + error.message, 'error');
    }
}

// ============ Utility Functions ============

function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// ============ Event Listeners ============

if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            showToast('Wallet disconnected', 'info');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast('Account changed', 'info');
            setTimeout(() => window.location.reload(), 1000);
        }
    });

    window.ethereum.on('chainChanged', () => {
        showToast('Network changed, reloading...', 'info');
        setTimeout(() => window.location.reload(), 1000);
    });
}

// Content Security Policy enforcement
window.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP Violation:', e.violatedDirective);
});
