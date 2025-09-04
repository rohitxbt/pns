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

// SPEED OPTIMIZATION: Global instances
const GLOBAL_PROVIDER = new ethers.JsonRpcProvider('https://testnet-rpc.plasma.to');
const GLOBAL_READ_CONTRACT = new ethers.Contract(contractAddress, contractABI, GLOBAL_PROVIDER);

// Domain cache for faster repeat searches
const DOMAIN_CACHE = new Map();

// Timer Component
function Timer({ isActive, duration, onComplete, label }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete && onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, duration, onComplete]);

  if (!isActive) return null;

  return (
    <div className="timer-container">
      <div className="timer-progress">
        <div 
          className="timer-bar" 
          style={{ 
            width: `${((duration - timeLeft) / duration) * 100}%`,
            transition: 'width 1s linear'
          }}
        />
      </div>
      <span className="timer-text">
        {label}: {timeLeft}s
      </span>
    </div>
  );
}

function MainUI() {
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [domainName, setDomainName] = useState("");
  const [message, setMessage] = useState("Enter a domain name to search.");
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedTld, setSelectedTld] = useState(".xpl");
  
  // Multi-step states
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState("");
  
  // Search feature states
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchDomain, setSearchDomain] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchSelectedTld, setSearchSelectedTld] = useState(".xpl");
  
  // Timer states
  const [searchTimer, setSearchTimer] = useState({ active: false, duration: 5 });
  const [connectTimer, setConnectTimer] = useState({ active: false, duration: 10 });
  const [registrationTimer, setRegistrationTimer] = useState({ active: false, duration: 15 });

  const addPlasmaNetwork = async () => {
    try {
      setConnectTimer({ active: true, duration: 10 });
      setMessage("Adding Plasma network to wallet...");
      
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [PLASMA_TESTNET],
      });
      
      setConnectTimer({ active: false, duration: 10 });
      setMessage("Plasma network added successfully!");
      return true;
    } catch (error) {
      console.error('Failed to add Plasma network:', error);
      setConnectTimer({ active: false, duration: 10 });
      setMessage("Failed to add network. Please add manually.");
      return false;
    }
  };

  const switchToPlasma = async () => {
    try {
      setConnectTimer({ active: true, duration: 8 });
      setMessage("Switching to Plasma Testnet...");
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: PLASMA_TESTNET.chainId }],
      });
      
      setConnectTimer({ active: false, duration: 8 });
      setMessage("Successfully switched to Plasma!");
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, try to add it
        return await addPlasmaNetwork();
      }
      console.error('Failed to switch to Plasma network:', error);
      setConnectTimer({ active: false, duration: 8 });
      
      if (error.code === 4001) {
        setMessage("Network switch cancelled by user.");
      } else {
        setMessage("Failed to switch network. Please switch manually to Plasma Testnet.");
      }
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
        setConnectTimer({ active: true, duration: 15 });
        
        // Network check
        setMessage("Checking network...");
        const isOnPlasma = await checkNetwork();
        
        if (!isOnPlasma) {
          const switched = await switchToPlasma();
          if (!switched) {
            setConnectTimer({ active: false, duration: 15 });
            return;
          }
        }

        setMessage("Connecting wallet...");
        await window.ethereum.request({ method: 'eth_requestAccounts' }); 
        
        const provider = new ethers.BrowserProvider(window.ethereum); 
        const signer = await provider.getSigner(); 
        const address = await signer.getAddress(); 
        const connectedContract = new ethers.Contract(contractAddress, contractABI, signer); 
        
        setUserAddress(`${address.substring(0, 6)}...${address.substring(address.length - 4)}`); 
        setContract(connectedContract); 
        setConnectTimer({ active: false, duration: 15 });
        setMessage("Wallet connected successfully!"); 
        
        // Move to step 3 after wallet connection
        setTimeout(() => {
          setCurrentStep(3);
          setMessage(`Ready to purchase '${selectedDomain}${selectedTld}'`);
        }, 1000);
        
      } catch (error) { 
        console.error("Wallet Connection Error:", error);
        setConnectTimer({ active: false, duration: 15 });
        
        if (error.code === 4001) {
          setMessage("Wallet connection cancelled by user.");
        } else {
          setMessage("Wallet connection failed. Please try again.");
        }
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
    // Reset all timers
    setSearchTimer({ active: false, duration: 5 });
    setConnectTimer({ active: false, duration: 10 });
    setRegistrationTimer({ active: false, duration: 15 });
  };
  
  const checkAvailability = useCallback(async (nameToCheck, tld = selectedTld) => { 
    if (nameToCheck) { 
      try {
        const fullDomain = nameToCheck + tld;
        
        // Check cache first
        if (DOMAIN_CACHE.has(fullDomain)) {
          const cached = DOMAIN_CACHE.get(fullDomain);
          setMessage(cached.available ? `'${fullDomain}' is available!` : `'${fullDomain}' is already taken.`);
          setIsAvailable(cached.available);
          return;
        }
        
        setSearchTimer({ active: true, duration: 5 });
        setMessage(`Checking '${fullDomain}'...`);
        setIsAvailable(false);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );
        
        const contractPromise = GLOBAL_READ_CONTRACT.nameToOwner(fullDomain);
        const ownerAddress = await Promise.race([contractPromise, timeoutPromise]);
        
        const available = ownerAddress === ethers.ZeroAddress;
        
        // Cache result for 30 seconds
        DOMAIN_CACHE.set(fullDomain, { available, timestamp: Date.now() });
        setTimeout(() => DOMAIN_CACHE.delete(fullDomain), 30000);
        
        setSearchTimer({ active: false, duration: 5 });
        
        if (available) {
          setMessage(`'${fullDomain}' is available!`);
          setIsAvailable(true);
        } else {
          setMessage(`'${fullDomain}' is already taken.`);
          setIsAvailable(false);
        }
      } catch (e) {
        console.error('Domain check error:', e);
        setSearchTimer({ active: false, duration: 5 });
        
        if (e.message === 'Request timeout') {
          setMessage("Request timeout. Please try again.");
        } else {
          setMessage("Error checking domain. Please try again.");
        }
        setIsAvailable(false);
      }
    }
  }, [selectedTld]);

  const searchDomainOwner = useCallback(async (domainToSearch) => {
    if (domainToSearch) {
      try {
        const fullDomain = domainToSearch + searchSelectedTld;
        
        // Check cache first
        if (DOMAIN_CACHE.has(fullDomain)) {
          const cached = DOMAIN_CACHE.get(fullDomain);
          if (cached.available) {
            setSearchResult(`'${fullDomain}' is not registered yet.`);
          } else {
            setSearchResult(`'${fullDomain}' is registered.`);
          }
          return;
        }
        
        setSearchTimer({ active: true, duration: 5 });
        setSearchResult(`Searching '${fullDomain}'...`);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 5000)
        );
        
        const contractPromise = GLOBAL_READ_CONTRACT.nameToOwner(fullDomain);
        const ownerAddress = await Promise.race([contractPromise, timeoutPromise]);
        
        // Cache result
        const available = ownerAddress === ethers.ZeroAddress;
        DOMAIN_CACHE.set(fullDomain, { available, timestamp: Date.now() });
        setTimeout(() => DOMAIN_CACHE.delete(fullDomain), 30000);
        
        setSearchTimer({ active: false, duration: 5 });
        
        if (available) {
          setSearchResult(`'${fullDomain}' is not registered yet.`);
        } else {
          setSearchResult(`'${fullDomain}' is owned by: ${ownerAddress}`);
        }
      } catch (e) {
        console.error('Search error:', e);
        setSearchTimer({ active: false, duration: 5 });
        
        if (e.message === 'Search timeout') {
          setSearchResult("Search timeout. Please try again.");
        } else {
          setSearchResult("Error searching domain.");
        }
      }
    }
  }, [searchSelectedTld]);

  useEffect(() => { 
    const handler = setTimeout(() => { 
      if (currentStep === 1 && !isSearchMode && domainName.length > 2) { 
        checkAvailability(domainName); 
      } else if (currentStep === 1 && !isSearchMode && domainName.length <= 2) { 
        setIsAvailable(false); 
        setMessage("Enter a domain name to search."); 
      } 
    }, 150);
    return () => clearTimeout(handler); 
  }, [domainName, checkAvailability, currentStep, isSearchMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isSearchMode && searchDomain.length > 2) {
        searchDomainOwner(searchDomain);
      } else if (isSearchMode && searchDomain.length <= 2) {
        setSearchResult("Enter domain name to search...");
      }
    }, 150);
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
        setRegistrationTimer({ active: true, duration: 15 });
        
        // Quick network check before transaction
        setMessage("Checking network...");
        const isOnPlasma = await checkNetwork();
        if (!isOnPlasma) {
          setRegistrationTimer({ active: false, duration: 15 });
          setMessage("Please switch to Plasma Testnet.");
          return;
        }

        const fullDomain = selectedDomain + selectedTld; 
        setMessage(`Registering '${fullDomain}'...`); 
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        // API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch("https://plasma-api-production.up.railway.app/api/sponsor-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domainName: fullDomain,
            userAddress: userAddress
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setRegistrationTimer({ active: false, duration: 15 });
        
        if (response.ok) {
          const result = await response.json();
          setMessage(
            `✅ Success! '${fullDomain}' is yours.\nTx Hash: ${result.txHash}`
          );
          
          // Clear cache for registered domain
          DOMAIN_CACHE.delete(fullDomain);
          
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
        setRegistrationTimer({ active: false, duration: 15 });
        
        if (error.name === 'AbortError') {
          setMessage("❌ Request timeout. Please try again.");
        } else {
          setMessage("❌ Registration failed. Please try again.");
        }
      }
    } 
  };

  const toggleSearchMode = () => {
    setIsSearchMode(!isSearchMode);
    // Reset timers when switching modes
    setSearchTimer({ active: false, duration: 5 });
    
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
    // Reset timers
    setConnectTimer({ active: false, duration: 10 });
    setRegistrationTimer({ active: false, duration: 15 });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
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
              
              <Timer 
                isActive={searchTimer.active} 
                duration={searchTimer.duration} 
                label={isSearchMode ? "Searching" : "Checking"}
                onComplete={() => setSearchTimer({ active: false, duration: 5 })}
              />
              
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
                  className="cool-next-button cursor-target" 
                  disabled={!isAvailable}
                >
                  <span>NEXT</span>
                </button>
              )}
            </div>
          </>
        );

      case 2:
        return (
          <div className="glass-card">
            <div className="step-indicator">
              <span className="step-number">2</span>
              <span className="step-title">Connect Wallet</span>
            </div>
            
            <Timer 
              isActive={connectTimer.active} 
              duration={connectTimer.duration} 
              label="Connecting"
              onComplete={() => setConnectTimer({ active: false, duration: 10 })}
            />
            
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
        return (
          <>
            <div className="connected-wallet-info"> 
              <span>{userAddress}</span> 
              {userOwnedDomain && (
                <span className="owned-domain-indicator">
                  🏠 {userOwnedDomain}
                </span>
              )}
              <button onClick={disconnectWallet} className="disconnect-button cursor-target">
                X
              </button> 
            </div>
            
            <div className="glass-card">
              <div className="step-indicator">
                <span className="step-number">3</span>
                <span className="step-title">Confirm Purchase</span>
              </div>
              
              {userOwnedDomain && (
                <div className="user-domain-error">
                  ❌ Cannot proceed - You already own: {userOwnedDomain}
                  <br />
                  <small>Only one domain per user is allowed</small>
                </div>
              )}
              
              <Timer 
                isActive={registrationTimer.active} 
                duration={registrationTimer.duration} 
                label="Registering"
                onComplete={() => setRegistrationTimer({ active: false, duration: 15 })}
              />
              
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
                <button 
                  onClick={handleBuy} 
                  className="buy-button cursor-target"
                  disabled={userOwnedDomain !== null}
                  title={userOwnedDomain ? "You already own a domain" : ""}
                >
                  {userOwnedDomain ? "ALREADY OWNED" : "BUY DOMAIN"}
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
      
      {!isMobile && <TargetCursor spinDuration={2} hideDefaultCursor={true} />}
      
      <MainUI />
    </div>
  );
}

export default App;
