// Function to generate a unique device ID
function generateDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export const environment = {
  production: false,
  // pointing to production backend to bypass Vercel file replacement issues
  apiUrl: 'http://mahdacad.runasp.net/api',
  deviceId: generateDeviceId(),
  // n8n webhook URL for chatbot
  n8nWebhookUrl: 'https://sobhy012.app.n8n.cloud/webhook/23c13b50-4750-42ce-a230-bf62afaa27f8/chat'
};
