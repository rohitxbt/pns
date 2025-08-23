import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import TargetCursor from './TargetCursor';
import './App.css';

const contractAddress = "0x40Fe1d26E9D6BD3aE5641e4a6e81dF66Ab49326b";
const contractABI = [ { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" } ], "name": "Transfer", "type": "event" }, { "inputs": [], "name": "COST_TO_REGISTER", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "", "type": "string" } ], "name": "nameToOwner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "ownerToName", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "_name", "type": "string" } ], "name": "register", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" } ];

function MainUI() {
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [domainName, setDomainName] = useState("");
  const [message, setMessage] = useState("Connect wallet to begin.");
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedTld, setSelectedTld] = useState(".xpl");
  
  const connectWallet = async () => { 
    if (typeof window.ethereum !== 'undefined') { 
      try { 
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
        setMessage("Wrong network. Please use Sepolia.");
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
      const fullDomain = domainName + selectedTld; 
      setMessage(`Registering '${fullDomain}'...`); 
      const registrationCost = ethers.parseEther("0.01"); 
      const tx = await contract.register(fullDomain, { value: registrationCost }); 
      await tx.wait(); 
      setMessage(`Success! '${fullDomain}' is yours.`); 
      setIsAvailable(false); 
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
                className={`tld-button ${selectedTld === tld ? 'active' : ''}`} 
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

  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Preload karne ke liye
      video.load();
      
      const handleCanPlay = () => {
        setVideoLoaded(true);
        video.play().catch(error => {
          console.log("Video autoplay failed:", error);
          const handleFirstClick = () => {
            video.play();
            document.removeEventListener('click', handleFirstClick);
          };
          document.addEventListener('click', handleFirstClick);
        });
      };

      video.addEventListener('canplay', handleCanPlay);
      return () => video.removeEventListener('canplay', handleCanPlay);
    }
  }, []);

  return (
    <div className="app-container">
      <div className="background-container">
        {/* Loading state ke liye fallback background */}
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
          {/* 🔥 CLOUDINARY CDN URL - PRIMARY SOURCE */}
          <source 
            src="https://res.cloudinary.com/ds44xcm9r/video/upload/v1755953889/terminal-bg_ihc94l.mp4" 
            type="video/mp4" 
          />
          
          {/* FALLBACK SOURCES - Agar Cloudinary fail ho jaye */}
          <source src="/terminal-bg.mp4" type="video/mp4" />
          <source src="./terminal-bg.mp4" type="video/mp4" />
        </video>
      </div>
      <TargetCursor spinDuration={2} hideDefaultCursor={true} />
      <MainUI />
    </div>
  );
}

export default App;
