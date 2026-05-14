import { Step } from 'react-joyride';

// Custom step data interface for images
export interface StepData {
  image?: string;
  imageAlt?: string;
}

// ===========================================
// MAIN ONBOARDING TOUR (General introduction)
// ===========================================
export const onboardingSteps: Step[] = [
  {
    target: '#trading-chart',
    title: 'Welcome to Tide!',
    content: "Let's show you around Tide. This quick tour will help you get started with token pairs, exchange selection, and more.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '#dex-mode-selector',
    title: 'Choose Your Exchange',
    content: 'Select which exchange to trade on. We support Hyperliquid, Aster, and Lighter. Auto mode finds the best prices across all exchanges.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#order-panel',
    title: 'Place Orders',
    content: 'Use this panel to place your trades. Choose your order type (Market or Limit), set your position size, and adjust leverage up to 125x.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '#positions-table',
    title: 'Your Positions',
    content: 'Your open positions will appear here. You can monitor your PnL, close positions, or flip your trade direction at any time.',
    placement: 'top',
    disableBeacon: true,
  },
];

// ===========================================
// HYPERLIQUID SETUP TOUR
// Uses 'body' as target for centered display since the
// enable-trading-btn may not exist if already enabled
// ===========================================
export const hyperliquidSteps: Step[] = [
  {
    target: 'body',
    title: 'Step 1: Deposit Funds',
    content: 'First, deposit USDC to your Hyperliquid account on Arbitrum network. Click "Deposit / Withdraw" in the order panel to get started.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 2: Enable Trading',
    content: 'After depositing, click the "Enable Hyperliquid Trading" button to generate API keys. This allows Tide to execute trades on your behalf.',
    placement: 'center',
    disableBeacon: true,
  },
];

// ===========================================
// ASTER SETUP TOUR (Simple - no extra steps)
// ===========================================
export const asterSteps: Step[] = [
  {
    target: '#order-panel',
    title: 'Ready to Trade on Aster!',
    content: 'Great news! With Aster, you can start trading right away after connecting your wallet. No additional setup required.',
    placement: 'left',
    disableBeacon: true,
  },
];

// ===========================================
// LIGHTER SETUP TOUR (Detailed 8-step guide)
// Uses 'body' as target since these are instructional steps
// about what to do on lighter.xyz, not highlighting UI elements
// ===========================================
export const lighterSteps: Step[] = [
  {
    target: 'body',
    title: 'Step 1: Sign into Lighter',
    content: 'First, go to lighter.xyz and sign in with the same wallet you connected to Tide.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 2: Navigate to API Keys',
    content: 'In Lighter, go to Tools → API Keys to access the API key management page.',
    placement: 'center',
    disableBeacon: true,
    data: {
      image: '/tooltip/lighter/step1.png',
      imageAlt: 'Navigate to Tools > API Keys in Lighter',
    } as StepData,
  },
  {
    target: 'body',
    title: 'Step 3: Generate API Key',
    content: 'Click the "Generate API Key" button to start creating your API credentials.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 4: Set API Key Index',
    content: 'Set the API Key Index to 2. This is important for Tide to work correctly with your Lighter account.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 5: Sign Transaction',
    content: 'Click "Generate" and sign the transaction in your wallet to create the API key.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 6: Save Your Keys',
    content: 'Copy and securely save the API Public Key and API Private Key. You will need to paste these into Tide.',
    placement: 'center',
    disableBeacon: true,
    data: {
      image: '/tooltip/lighter/step2.png',
      imageAlt: 'Copy and save your API keys',
    } as StepData,
  },
  {
    target: 'body',
    title: 'Step 7: Find Account Index',
    content: 'On the top left, click on your wallet address, then click "Explorer" to view your account details.',
    placement: 'center',
    disableBeacon: true,
    data: {
      image: '/tooltip/lighter/step3.png',
      imageAlt: 'Click wallet then Explorer',
    } as StepData,
  },
  {
    target: 'body',
    title: 'Step 8: Copy Account Index',
    content: 'Find and copy your Account Index number. You will need this along with your API keys to import into Tide.',
    placement: 'center',
    disableBeacon: true,
    data: {
      image: '/tooltip/lighter/step4.jpg',
      imageAlt: 'Copy your Account Index',
    } as StepData,
  },
];

// ===========================================
// PACIFICA SETUP TOUR (Server-managed keypair)
// Uses 'body' as target since these are instructional steps
// ===========================================
export const pacificaSteps: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Pacifica!',
    content: 'Pacifica is a decentralized perpetuals exchange on Solana. Trading is done through a server-managed keypair for seamless execution.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 1: Enable Trading',
    content: 'Click the "Enable Pacifica Trading" button. This generates a dedicated Solana trading address for you on our servers.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    title: 'Step 2: Fund Your Trading Address',
    content: 'Deposit USDC to your Pacifica trading address. This is a Solana address that will be shown after enabling trading.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '#order-panel',
    title: 'Ready to Trade!',
    content: 'Once funded, you can place trades using the order panel. Tide will execute your orders on Pacifica automatically.',
    placement: 'left',
    disableBeacon: true,
  },
];
