import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import TargetCursor from './TargetCursor';
import './App.css';

const contractAddress = "0x204F374E0C13999D8DE6C15D5c691c32AAA29D49";
const contractABI = [ {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "COST_TO_REGISTER",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "nameToOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "ownerToName",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "register",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "registerFor",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    } ];

// Plasma Testnet configuration
const PLASMA_TESTNET = {
  chainId: '0x2612', // 9746 in hex
  chainName: 'Plasma Testnet',
  nativeCurrency: {
    name: 'XPL',
    symbol: 'XPL',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.plasma.to'],
  blockExplorerUrls: ['https://testnet.plasmascan.to'],
};

function MainUI() {
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [domainName, setDomainName] = useState("");
  const [message, setMessage] = useState("Enter a domain name to search.");
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedTld, setSelectedTld] = useState(".xpl");
  
  // Multi-step states
  const [currentStep, setCurrentStep] = useState(1); // 1: Search, 2: Connect Wallet, 3: Confirm Purchase
  const [selectedDomain, setSelectedDomain] = useState(""); // Domain selected for purchase
  
  // Search feature states
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchDomain, setSearchDomain] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchSelectedTld, setSearchSelectedTld] = useState(".xpl");
  
  const addPlasmaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [PLASMA_TESTNET],
      });
      return true;
    } catch (error) {
      console.error('Failed to add Plasma network:', error);
      return false;
    }
  };

  const switchToPlasma = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: PLASMA_TESTNET.chainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, try to add it
        return await addPlasmaNetwork();
      }
      console.error('Failed to switch to Plasma network:', error);
      return false;
    }
  };

  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === PLASMA_TESTNET.chainId;
    } catch (error) {
      console.error('Failed to check network:', error);
      return false;
    }
  };

  const connectWallet = async () => { 
    if (typeof window.ethereum !== 'undefined') { 
      try { 
        // First check if we're on the right network
        const isOnPlasma = await checkNetwork();
        
        if (!isOnPlasma) {
          setMessage("Switching to Plasma Testnet...");
          const switched = await switchToPlasma();
          if (!switched) {
            setMessage("Please switch to Plasma Testnet manually.");
            return;
          }
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' }); 
        const provider = new ethers.BrowserProvider(window.ethereum); 
        const signer = await provider.getSigner(); 
        const address = await signer.getAddress(); 
        const connectedContract = new ethers.Contract(contractAddress, contractABI, signer); 
        setUserAddress(`${address.substring(0, 6)}...${address.substring(address.length - 4)}`); 
        setContract(connectedContract); 
        setMessage("Wallet connected successfully!"); 
        
        // Move to step 3 after wallet connection
        setTimeout(() => {
          setCurrentStep(3);
          setMessage(`Ready to purchase '${selectedDomain}${selectedTld}'`);
        }, 1000);
        
      } catch (error) { 
        console.error("Wallet Connection Error:", error); 
        setMessage("Wallet connection failed."); 
      } 
    } else { 
      setMessage("MetaMask is not installed."); 
    } 
  };

  const disconnectWallet = () => { 
    setUserAddress(null); 
    setContract(null); 
    setDomainName(""); 
    setIsAvailable(false); 
    setMessage("Wallet disconnected."); 
    setIsSearchMode(false);
    setSearchResult("");
    setSearchDomain("");
    setCurrentStep(1);
    setSelectedDomain("");
  };
  
  const checkAvailability = useCallback(async (nameToCheck, tld = selectedTld) => { 
    if (nameToCheck) { 
      try {
        const fullDomain = nameToCheck + tld;
        setMessage(`Checking '${fullDomain}'...`);
        setIsAvailable(false);
        
        // Create a read-only provider for checking availability
        const provider = new ethers.JsonRpcProvider('https://testnet-rpc.plasma.to');
        const readOnlyContract = new ethers.Contract(contractAddress, contractABI, provider);
        
        const ownerAddress = await readOnlyContract.nameToOwner(fullDomain);
        if (ownerAddress === ethers.ZeroAddress) {
          setMessage(`'${fullDomain}' is available!`);
          setIsAvailable(true);
        } else {
          setMessage(`'${fullDomain}' is already taken.`);
          setIsAvailable(false);
        }
      } catch (e) {
        setMessage("Error checking domain availability.");
        console.error(e);
      }
    }
  }, [selectedTld]);

  // Search domain function
  const searchDomainOwner = useCallback(async (domainToSearch) => {
    if (domainToSearch) {
      try {
        const fullDomain = domainToSearch + searchSelectedTld;
        setSearchResult(`Searching '${fullDomain}'...`);
        
        // Create a read-only provider for searching
        const provider = new ethers.JsonRpcProvider('https://testnet-rpc.plasma.to');
        const readOnlyContract = new ethers.Contract(contractAddress, contractABI, provider);
        
        const ownerAddress = await readOnlyContract.nameToOwner(fullDomain);
        if (ownerAddress === ethers.ZeroAddress) {
          setSearchResult(`'${fullDomain}' is not registered yet.`);
        } else {
          setSearchResult(`'${fullDomain}' is owned by: ${ownerAddress}`);
        }
      } catch (e) {
        setSearchResult("Error searching domain.");
        console.error(e);
      }
    }
  }, [searchSelectedTld]);

  // Step 1: Domain search effect
  useEffect(() => { 
    const handler = setTimeout(() => { 
      if (currentStep === 1 && !isSearchMode && domainName.length > 2) { 
        checkAvailability(domainName); 
      } else if (currentStep === 1 && !isSearchMode && domainName.length <= 2) { 
        setIsAvailable(false); 
        setMessage("Enter a domain name to search."); 
      } 
    }, 500); 
    return () => clearTimeout(handler); 
  }, [domainName, checkAvailability, currentStep, isSearchMode]);

  // Search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isSearchMode && searchDomain.length > 2) {
        searchDomainOwner(searchDomain);
      } else if (isSearchMode && searchDomain.length <= 2) {
        setSearchResult("Enter domain name to search...");
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchDomain, searchDomainOwner, isSearchMode]);

  const handleNext = () => {
    if (currentStep === 1 && isAvailable) {
      setSelectedDomain(domainName);
      setCurrentStep(2);
      setMessage("Please connect your wallet to continue.");
    }
  };

  const handleBuy = async () => { 
    if (contract && selectedDomain) { 
      try {
        // Double check network before transaction
        const isOnPlasma = await checkNetwork();
        if (!isOnPlasma) {
          setMessage("Please switch to Plasma Testnet.");
          return;
        }

        const fullDomain = selectedDomain + selectedTld; 
        setMessage(`Registering '${fullDomain}'...`); 
        
        // Get user address for sponsored registration
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        // Call backend API for sponsored registration
        const response = await fetch("https://plasma-sponsor-7jbisi2ka-rohit0x-s-projects.vercel.app/api/sponsor-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domainName: fullDomain,
            userAddress: userAddress
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          setMessage(
            `✅ Success! '${fullDomain}' is yours.\nTx Hash: ${result.txHash}`
          );
          // Reset to step 1 after successful purchase
          setTimeout(() => {
            setCurrentStep(1);
            setDomainName("");
            setSelectedDomain("");
            setIsAvailable(false);
            setMessage("Domain registered! Search for another domain.");
          }, 3000);
        } else {
          setMessage("❌ Registration failed. Please try again.");
        }

      } catch (error) {
        console.error("Registration failed:", error);
        setMessage("❌ Registration failed. Please try again.");
      }
    } 
  };

  const toggleSearchMode = () => {
    setIsSearchMode(!isSearchMode);
    if (!isSearchMode) {
      setSearchDomain("");
      setSearchResult("Enter domain name to search...");
    } else {
      setMessage("Enter a domain name to search.");
    }
  };

  const goBackToSearch = () => {
    setCurrentStep(1);
    setSelectedDomain("");
    setMessage("Enter a domain name to search.");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Domain Search
        return (
          <>
            {userAddress && (
              <div className="connected-wallet-info"> 
                <span>{userAddress}</span> 
                <button onClick={disconnectWallet} className="disconnect-button cursor-target">
                  X
                </button> 
              </div> 
            )}

            {/* Search/Register Toggle - Always visible in Step 1 */}
            <div className="mode-toggle">
              <button 
                onClick={toggleSearchMode} 
                className={`mode-button cursor-target ${isSearchMode ? 'search-mode' : 'register-mode'}`}
              >
                {isSearchMode ? 'REGISTER MODE' : 'SEARCH MODE'}
              </button>
            </div>

            <div className="glass-card">
              <div className="step-indicator">
                <span className="step-number">1</span>
                <span className="step-title">Search Domain</span>
              </div>
              
              <div className="input-container cursor-target">
                <input 
                  type="text" 
                  className="domain-input" 
                  placeholder={isSearchMode ? "search domain" : "domain"} 
                  value={isSearchMode ? searchDomain : domainName} 
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();
                    if (isSearchMode) {
                      setSearchDomain(value);
                    } else {
                      setDomainName(value);
                    }
                  }} 
                />
                <div className="tld-selector">
                  {['.xpl'].map(tld => ( 
                    <button 
                      key={tld} 
                      className={`tld-button cursor-target ${(isSearchMode ? searchSelectedTld : selectedTld) === tld ? 'active' : ''}`} 
                      onClick={() => {
                        if (isSearchMode) {
                          setSearchSelectedTld(tld);
                        } else {
                          setSelectedTld(tld);
                        }
                      }}
                    >
                      {tld}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="status-message">
                {isSearchMode ? searchResult : message}
              </div>
              
              {!isSearchMode && (
                <button 
                  onClick={handleNext} 
                  className="buy-button cursor-target" 
                  disabled={!isAvailable}
                >
                  NEXT
                </button>
              )}
            </div>
          </>
        );

      case 2:
        // Step 2: Connect Wallet
        return (
          <div className="glass-card">
            <div className="step-indicator">
              <span className="step-number">2</span>
              <span className="step-title">Connect Wallet</span>
            </div>
            
            <div className="domain-preview">
              <span className="domain-name">{selectedDomain}{selectedTld}</span>
              <span className="domain-status">Available ✓</span>
            </div>
            
            <div className="status-message">
              {message}
            </div>
            
            <div className="step-buttons">
              <button onClick={goBackToSearch} className="back-button cursor-target">
                BACK
              </button>
              <button onClick={connectWallet} className="connect-button cursor-target">
                CONNECT WALLET
              </button>
            </div>
          </div>
        );

      case 3:
        // Step 3: Confirm Purchase
        return (
          <>
            <div className="connected-wallet-info"> 
              <span>{userAddress}</span> 
              <button onClick={disconnectWallet} className="disconnect-button cursor-target">
                X
              </button> 
            </div>
            
            <div className="glass-card">
              <div className="step-indicator">
                <span className="step-number">3</span>
                <span className="step-title">Confirm Purchase</span>
              </div>
              
              <div className="domain-preview large">
                <span className="domain-name">{selectedDomain}{selectedTld}</span>
                <span className="domain-price">FREE (Gas Sponsored)</span>
              </div>
              
              <div className="status-message">
                {message}
              </div>
              
              <div className="step-buttons">
                <button onClick={goBackToSearch} className="back-button cursor-target">
                  BACK
                </button>
                <button onClick={handleBuy} className="buy-button cursor-target">
                  BUY DOMAIN
                </button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return renderStepContent();
}

function App() {
  const videoRef = React.useRef(null);
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.load();
      
      const handleCanPlay = () => {
        setVideoLoaded(true);
        const playVideo = async () => {
          try {
            await video.play();
          } catch (error) {
            console.log("Video autoplay failed:", error);
            // Mobile devices often require user interaction for video play
            if (isMobile) {
              const handleFirstTouch = () => {
                video.play();
                document.removeEventListener('touchstart', handleFirstTouch);
                document.removeEventListener('click', handleFirstTouch);
              };
              document.addEventListener('touchstart', handleFirstTouch);
              document.addEventListener('click', handleFirstTouch);
            }
          }
        };
        playVideo();
      };

      video.addEventListener('canplay', handleCanPlay);
      return () => video.removeEventListener('canplay', handleCanPlay);
    }
  }, [isMobile]);

  return (
    <div className="app-container">
      <div className="background-container">
        {!videoLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #001a0d 0%, #000 70%)',
            zIndex: 1
          }} />
        )}
        
        <video 
          ref={videoRef}
          autoPlay 
          loop 
          muted 
          playsInline
          preload="metadata"
          style={{
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            zIndex: 2
          }}
          onError={(e) => console.error("Video error:", e)}
          onLoadedData={() => console.log("Video data loaded")}
          onCanPlay={() => console.log("Video can play")}
        >
          <source 
            src="https://res.cloudinary.com/ds44xcm9r/video/upload/v1755953889/terminal-bg_ihc94l.mp4" 
            type="video/mp4" 
          />
          <source src="/terminal-bg.mp4" type="video/mp4" />
          <source src="./terminal-bg.mp4" type="video/mp4" />
        </video>
      </div>
      
      {/* Desktop pe hi TargetCursor show karo */}
      {!isMobile && <TargetCursor spinDuration={2} hideDefaultCursor={true} />}
      
      <MainUI />
    </div>
  );
}

export default App;
