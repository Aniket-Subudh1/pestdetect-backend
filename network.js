const os = require('os');

console.log('🔍 Finding your network configuration...\n');

const interfaces = os.networkInterfaces();
const ipAddresses = [];

Object.keys(interfaces).forEach(interfaceName => {
  const addresses = interfaces[interfaceName];
  addresses.forEach(address => {
    if (address.family === 'IPv4' && !address.internal) {
      ipAddresses.push({
        interface: interfaceName,
        address: address.address
      });
    }
  });
});

console.log('📡 Available IP addresses:');
ipAddresses.forEach((ip, index) => {
  console.log(`${index + 1}. ${ip.interface}: ${ip.address}`);
});

if (ipAddresses.length > 0) {
  console.log(`\n✅ Use this in your React Native app (services/api.js):`);
  console.log(`const API_BASE_URL = 'http://${ipAddresses[0].address}:5000/api';`);
} else {
  console.log('\n❌ No external IP addresses found. Using localhost...');
  console.log(`const API_BASE_URL = 'http://192.168.1.100:5000/api'; // Replace with your IP`);
}

console.log('\n🧪 Test commands:');
ipAddresses.forEach(ip => {
  console.log(`curl http://${ip.address}:5000/api/health`);
});

console.log('\n💡 Make sure:');
console.log('1. Your computer and phone are on the same WiFi network');
console.log('2. Windows/Mac firewall allows connections on port 5000');
console.log('3. The backend server is running with: npm start');