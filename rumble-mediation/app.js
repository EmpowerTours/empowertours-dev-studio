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
const statusCard = document.getElementById('statusCard');
const contractAddressEl = document.getElementById('contractAddress');
const creatorAddressEl = document.getElementById('creatorAddress');
const agreementNonceEl = document.getElementById('agreementNonce');
const contractBalanceEl = document.getElementById('contractBalance');

// Agreement type selector
const partnershipTypeBtn = document.getElementById('partnershipTypeBtn');
const settlementTypeBtn = document.getElementById('settlementTypeBtn');
const partnershipForm = document.getElementById('partnershipForm');
const settlementForm = document.getElementById('settlementForm');

// Partnership form elements
const partnershipBondAmount = document.getElementById('partnershipBondAmount');
const partnershipEquityPct = document.getElementById('partnershipEquityPct');
const partnershipDescription = document.getElementById('partnershipDescription');
const partnershipDuration = document.getElementById('partnershipDuration');
const previewPartnershipBtn = document.getElementById('previewPartnershipBtn');
const submitPartnershipBtn = document.getElementById('submitPartnershipBtn');

// Settlement form elements
const settlementAmount = document.getElementById('settlementAmount');
const settlementReason = document.getElementById('settlementReason');
const settlementObligations = document.getElementById('settlementObligations');
const settlementMutualRelease = document.getElementById('settlementMutualRelease');
const settlementConfidential = document.getElementById('settlementConfidential');
const previewSettlementBtn = document.getElementById('previewSettlementBtn');
const submitSettlementBtn = document.getElementById('submitSettlementBtn');

// Preview modal elements
const previewModal = document.getElementById('previewModal');
const agreementPreview = document.getElementById('agreementPreview');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');
const confirmProposalBtn = document.getElementById('confirmProposalBtn');

// State for current agreement being previewed
let currentAgreementData = null;

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

    // Agreement type switcher
    partnershipTypeBtn.addEventListener('click', () => switchAgreementType('partnership'));
    settlementTypeBtn.addEventListener('click', () => switchAgreementType('settlement'));

    // Preview buttons
    previewPartnershipBtn.addEventListener('click', previewPartnership);
    previewSettlementBtn.addEventListener('click', previewSettlement);

    // Submit buttons (will show preview first)
    submitPartnershipBtn.addEventListener('click', previewPartnership);
    submitSettlementBtn.addEventListener('click', previewSettlement);

    // Modal controls
    closePreviewBtn.addEventListener('click', closePreview);
    cancelPreviewBtn.addEventListener('click', closePreview);
    confirmProposalBtn.addEventListener('click', confirmProposal);

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
        const settlementAmt = await contract.SETTLEMENT_AMOUNT();
        const equityPercentage = await contract.PARTNERSHIP_EQUITY();

        creatorAddressEl.textContent = formatAddress(creator);
        agreementNonceEl.textContent = nonce.toString();
        contractBalanceEl.textContent = `${ethers.utils.formatEther(balance)} MON`;

        // Populate readonly form fields
        const bondAmountFormatted = ethers.utils.formatEther(partnershipBond);
        const settlementAmountFormatted = ethers.utils.formatEther(settlementAmt);
        const equityPercent = ethers.utils.formatUnits(equityPercentage, 2);

        partnershipBondAmount.value = `${bondAmountFormatted} MON`;
        partnershipEquityPct.value = `${equityPercent}%`;
        settlementAmount.value = `${settlementAmountFormatted} MON`;

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

// ============ Form UI Functions ============

function switchAgreementType(type) {
    if (type === 'partnership') {
        partnershipTypeBtn.classList.add('active');
        settlementTypeBtn.classList.remove('active');
        partnershipForm.style.display = 'block';
        settlementForm.style.display = 'none';
    } else {
        settlementTypeBtn.classList.add('active');
        partnershipTypeBtn.classList.remove('active');
        settlementForm.style.display = 'block';
        partnershipForm.style.display = 'none';
    }
}

// ============ Agreement Generation ============

function generatePartnershipAgreement(formData) {
    const timestamp = new Date().toISOString();

    const plainText = `PARTNERSHIP AGREEMENT

This Partnership Agreement ("Agreement") is entered into as of ${timestamp} between:

CREATOR: ${formData.creatorAddress}
PROPOSER (Rumble): ${formData.proposerAddress}

1. PERFORMANCE BOND
   Amount: ${formData.bondAmount}
   The Proposer shall deposit the above amount as a performance bond, held in escrow until partnership termination.

2. EQUITY GRANT
   Percentage: ${formData.equityPercent}
   Class: Same class as founders/common stock
   Rights: Non-forfeitable, no repurchase, no clawback, no drag-along without consent
   Status: Fully diluted, non-forfeitable equity grant

3. PARTNERSHIP DESCRIPTION
   ${formData.description}

4. DURATION
   ${formData.duration}

5. TERMINATION RIGHTS
   Creator-only termination authority. Bond returned to proposer upon termination.

6. BLOCKCHAIN TERMS
   - Agreement recorded on Monad Blockchain
   - Contract Address: ${formData.contractAddress}
   - Agreement Nonce: ${formData.nonce}
   - Terms Hash: ${formData.termsHash}

This agreement is cryptographically secured and executed via smart contract.`;

    const htmlPreview = `
        <div class="agreement-document">
            <h2>PARTNERSHIP AGREEMENT</h2>
            <p class="agreement-meta">Generated: ${new Date().toLocaleString()}</p>

            <h3>Parties</h3>
            <p><strong>Creator:</strong> ${formatAddress(formData.creatorAddress)}</p>
            <p><strong>Proposer (Rumble):</strong> ${formatAddress(formData.proposerAddress)}</p>

            <h3>1. Performance Bond</h3>
            <p><strong>Amount:</strong> ${formData.bondAmount}</p>
            <p>The Proposer shall deposit the above amount as a performance bond, held in escrow until partnership termination.</p>

            <h3>2. Equity Grant</h3>
            <p><strong>Percentage:</strong> ${formData.equityPercent}</p>
            <p><strong>Class:</strong> Same class as founders/common stock</p>
            <p><strong>Rights:</strong> Non-forfeitable, no repurchase, no clawback, no drag-along without consent</p>
            <p><strong>Status:</strong> Fully diluted, non-forfeitable equity grant</p>

            <h3>3. Partnership Description</h3>
            <p>${sanitizeInput(formData.description)}</p>

            <h3>4. Duration</h3>
            <p>${formData.duration}</p>

            <h3>5. Termination Rights</h3>
            <p>Creator-only termination authority. Bond returned to proposer upon termination.</p>

            <h3>6. Blockchain Terms</h3>
            <p><strong>Network:</strong> Monad Blockchain</p>
            <p><strong>Contract:</strong> ${formatAddress(formData.contractAddress)}</p>
            <p><strong>Agreement Nonce:</strong> ${formData.nonce}</p>

            <p class="agreement-footer">This agreement is cryptographically secured and executed via smart contract.</p>
        </div>
    `;

    return { plainText, htmlPreview };
}

function generateSettlementAgreement(formData) {
    const timestamp = new Date().toISOString();

    const plainText = `SETTLEMENT AGREEMENT

This Settlement Agreement ("Agreement") is entered into as of ${timestamp} between:

CREATOR: ${formData.creatorAddress}
PROPOSER (Rumble): ${formData.proposerAddress}

1. SETTLEMENT PAYMENT
   Amount: ${formData.settlementAmount}
   Release: After 48-hour timelock period

2. REASON FOR SETTLEMENT
   ${formData.reason}

3. OBLIGATIONS UPON ACCEPTANCE
   ${formData.obligations}

4. MUTUAL RELEASE
   ${formData.mutualRelease ? 'INCLUDED - Both parties release all claims against each other.' : 'NOT INCLUDED'}

5. CONFIDENTIALITY
   ${formData.confidential ? 'INCLUDED - Terms remain private and confidential.' : 'NOT INCLUDED - Terms are public.'}

6. BLOCKCHAIN TERMS
   - Agreement recorded on Monad Blockchain
   - Contract Address: ${formData.contractAddress}
   - Agreement Nonce: ${formData.nonce}
   - Terms Hash: ${formData.termsHash}
   - Withdrawal Timelock: 48 hours after acceptance

This agreement is cryptographically secured and executed via smart contract.`;

    const htmlPreview = `
        <div class="agreement-document">
            <h2>SETTLEMENT AGREEMENT</h2>
            <p class="agreement-meta">Generated: ${new Date().toLocaleString()}</p>

            <h3>Parties</h3>
            <p><strong>Creator:</strong> ${formatAddress(formData.creatorAddress)}</p>
            <p><strong>Proposer (Rumble):</strong> ${formatAddress(formData.proposerAddress)}</p>

            <h3>1. Settlement Payment</h3>
            <p><strong>Amount:</strong> ${formData.settlementAmount}</p>
            <p><strong>Release:</strong> After 48-hour timelock period</p>

            <h3>2. Reason for Settlement</h3>
            <p>${sanitizeInput(formData.reason)}</p>

            <h3>3. Obligations Upon Acceptance</h3>
            <p>${sanitizeInput(formData.obligations)}</p>

            <h3>4. Mutual Release</h3>
            <p>${formData.mutualRelease ? '<strong>INCLUDED</strong> - Both parties release all claims against each other.' : '<strong>NOT INCLUDED</strong>'}</p>

            <h3>5. Confidentiality</h3>
            <p>${formData.confidential ? '<strong>INCLUDED</strong> - Terms remain private and confidential.' : '<strong>NOT INCLUDED</strong> - Terms are public.'}</p>

            <h3>6. Blockchain Terms</h3>
            <p><strong>Network:</strong> Monad Blockchain</p>
            <p><strong>Contract:</strong> ${formatAddress(formData.contractAddress)}</p>
            <p><strong>Agreement Nonce:</strong> ${formData.nonce}</p>
            <p><strong>Withdrawal Timelock:</strong> 48 hours after acceptance</p>

            <p class="agreement-footer">This agreement is cryptographically secured and executed via smart contract.</p>
        </div>
    `;

    return { plainText, htmlPreview };
}

function hashAgreement(agreementText) {
    // Use ethers.utils.id to create a keccak256 hash of the agreement
    // This replaces IPFS for now - just hash the agreement content
    return ethers.utils.id(agreementText);
}

// ============ Preview Functions ============

async function previewPartnership() {
    const description = partnershipDescription.value.trim();
    const duration = partnershipDuration.options[partnershipDuration.selectedIndex].text;

    // Validation
    if (!description) {
        showToast('Please provide a partnership description', 'error');
        return;
    }

    if (!contract) {
        showToast('Contract not connected', 'error');
        return;
    }

    try {
        const creator = await contract.CREATOR();
        const nonce = await contract.agreementNonce();
        const partnershipBond = await contract.PARTNERSHIP_BOND();
        const equityPercentage = await contract.PARTNERSHIP_EQUITY();

        const formData = {
            creatorAddress: creator,
            proposerAddress: currentAccount,
            bondAmount: partnershipBondAmount.value,
            equityPercent: partnershipEquityPct.value,
            description: description,
            duration: duration,
            contractAddress: CONFIG.CONTRACT_ADDRESS,
            nonce: nonce.toString(),
            termsHash: 'Generated on submission'
        };

        const { plainText, htmlPreview } = generatePartnershipAgreement(formData);

        // Store for later submission
        currentAgreementData = {
            type: 'partnership',
            plainText: plainText,
            bondAmount: partnershipBond
        };

        showPreview(htmlPreview);

    } catch (error) {
        console.error('Failed to generate preview:', error);
        showToast('Failed to generate preview: ' + error.message, 'error');
    }
}

async function previewSettlement() {
    const reason = settlementReason.value.trim();
    const obligations = settlementObligations.value.trim();
    const mutualRelease = settlementMutualRelease.checked;
    const confidential = settlementConfidential.checked;

    // Validation
    if (!reason || !obligations) {
        showToast('Please provide settlement reason and obligations', 'error');
        return;
    }

    if (!contract) {
        showToast('Contract not connected', 'error');
        return;
    }

    try {
        const creator = await contract.CREATOR();
        const nonce = await contract.agreementNonce();
        const settlementAmt = await contract.SETTLEMENT_AMOUNT();

        const formData = {
            creatorAddress: creator,
            proposerAddress: currentAccount,
            settlementAmount: settlementAmount.value,
            reason: reason,
            obligations: obligations,
            mutualRelease: mutualRelease,
            confidential: confidential,
            contractAddress: CONFIG.CONTRACT_ADDRESS,
            nonce: nonce.toString(),
            termsHash: 'Generated on submission'
        };

        const { plainText, htmlPreview } = generateSettlementAgreement(formData);

        // Store for later submission
        currentAgreementData = {
            type: 'settlement',
            plainText: plainText,
            settlementAmount: settlementAmt
        };

        showPreview(htmlPreview);

    } catch (error) {
        console.error('Failed to generate preview:', error);
        showToast('Failed to generate preview: ' + error.message, 'error');
    }
}

function showPreview(agreementHTML) {
    agreementPreview.innerHTML = agreementHTML;
    previewModal.style.display = 'flex';
}

function closePreview() {
    previewModal.style.display = 'none';
    currentAgreementData = null;
}

// ============ Submit Proposal ============

async function confirmProposal() {
    if (!currentAgreementData || !contract) {
        showToast('No agreement data available', 'error');
        return;
    }

    try {
        confirmProposalBtn.disabled = true;
        confirmProposalBtn.textContent = 'Submitting...';

        // Generate hash from the agreement text
        const termsHash = hashAgreement(currentAgreementData.plainText);

        showToast('Please confirm transaction in MetaMask...', 'info');

        let tx;
        if (currentAgreementData.type === 'partnership') {
            // For partnership, we use the same hash for both terms and equity document
            // In production, you might want separate hashes
            tx = await contract.proposePartnership(termsHash, termsHash, {
                value: currentAgreementData.bondAmount
            });
        } else {
            tx = await contract.proposeSettlement(termsHash, {
                value: currentAgreementData.settlementAmount
            });
        }

        showToast('Transaction submitted! Waiting for confirmation...', 'success');

        await tx.wait();

        showToast(`${currentAgreementData.type === 'partnership' ? 'Partnership' : 'Settlement'} proposed successfully!`, 'success');

        // Clear form
        if (currentAgreementData.type === 'partnership') {
            partnershipDescription.value = '';
            partnershipDuration.selectedIndex = 0;
        } else {
            settlementReason.value = '';
            settlementObligations.value = '';
            settlementMutualRelease.checked = false;
            settlementConfidential.checked = false;
        }

        // Close modal
        closePreview();

        // Reload data
        await loadContractData();
        await loadAgreementStatus();

    } catch (error) {
        console.error('Failed to submit proposal:', error);
        let errorMsg = 'Failed to submit proposal';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.message) {
            errorMsg = error.message.substring(0, 100);
        }
        showToast(errorMsg, 'error');
    } finally {
        confirmProposalBtn.disabled = false;
        confirmProposalBtn.textContent = 'Confirm & Submit';
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
