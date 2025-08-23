import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import TargetCursor from './TargetCursor';
import './App.css';

const contractAddress = "0x40Fe1d26E9D6BD3aE5641e4a6e81dF66Ab49326b";
const contractABI = [ { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" } ], "name": "Transfer", "type": "event" }, { "inputs": [], "name": "COST_TO_REGISTER", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "", "type": "string" } ], "name": "nameToOwner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "ownerToName", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "_name", "type": "string" } ], "name": "register", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" } ];

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
  const [message, setMessage] = useState("Connect wallet to begin.");
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedTld, setSelectedTld] = useState(".xpl");
  
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
        setMessage("Enter a domain name to check."); 
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
  };
  
  const checkAvailability = useCallback(async (nameToCheck) => { 
    if (contract && nameToCheck) { 
      try {
        // First check if we're still on the right network
        const isOnPlasma = await checkNetwork();
        if (!isOnPlasma) {
          setMessage("Please switch to Plasma Testnet.");
          setIsAvailable(false);
          return;
        }

        const fullDomain = nameToCheck + selectedTld;
        setMessage(`Checking '${fullDomain}'...`);
        setIsAvailable(false);
        const ownerAddress = await contract.nameToOwner(fullDomain);
        if (ownerAddress === ethers.ZeroAddress) {
          setMessage(`'${fullDomain}' is available!`);
          setIsAvailable(true);
        } else {
          setMessage(`'${fullDomain}' is already taken.`);
          setIsAvailable(false);
        }
      } catch (e) {
        setMessage("Wrong network. Please use Plasma Testnet.");
        console.error(e)
      }
    }
  }, [contract, selectedTld]);

  useEffect(() => { 
    const handler = setTimeout(() => { 
      if (domainName.length > 2) { 
        checkAvailability(domainName); 
      } else { 
        setIsAvailable(false); 
        if(userAddress) setMessage("Enter a domain name to check."); 
      } 
    }, 500); 
    return () => clearTimeout(handler); 
  }, [domainName, checkAvailability, userAddress]);

  const handleBuy = async () => { 
    if (contract && isAvailable) { 
      try {
        // Double check network before transaction
        const isOnPlasma = await checkNetwork();
        if (!isOnPlasma) {
          setMessage("Please switch to Plasma Testnet.");
          return;
        }

        const fullDomain = domainName + selectedTld; 
        setMessage(`Registering '${fullDomain}'...`); 
        
        // Get user address for sponsored registration
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        // Call backend API for sponsored registration
        const response = await fetch('/api/sponsor-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            domainName: fullDomain,
            userAddress: userAddress
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          setMessage(`Success! '${fullDomain}' is yours.`);
          setIsAvailable(false);
        } else {
          setMessage("Registration failed. Please try again.");
        }
        
      } catch (error) {
        console.error("Registration failed:", error);
        setMessage("Registration failed. Please try again.");
      }
    } 
  };

  return (
    <>
      {!userAddress ? ( 
        <button onClick={connectWallet} className="connect-wallet-button cursor-target">
          Connect Wallet
        </button> 
      ) : ( 
        <div className="connected-wallet-info"> 
          <span>{userAddress}</span> 
          <button onClick={disconnectWallet} className="disconnect-button cursor-target">
            X
          </button> 
        </div> 
      )}
      <div className="glass-card">
        <div className="input-container cursor-target">
          <input 
            type="text" 
            className="domain-input" 
            placeholder="domain" 
            value={domainName} 
            onChange={(e) => setDomainName(e.target.value.toLowerCase())} 
            disabled={!userAddress} 
          />
          <div className="tld-selector">
            {['.xpl'].map(tld => ( 
              <button 
                key={tld} 
                className={`tld-button cursor-target ${selectedTld === tld ? 'active' : ''}`} 
                onClick={() => setSelectedTld(tld)}
              >
                {tld}
              </button>
            ))}
          </div>
        </div>
        <div className="status-message">{message}</div>
        <button 
          onClick={handleBuy} 
          className="buy-button cursor-target" 
          disabled={!isAvailable}
        >
          BUY
        </button>
      </div>
    </>
  );
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
