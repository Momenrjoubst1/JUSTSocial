const fs = require('fs'); let c = fs.readFileSync('src/pages/videochat/components/AgentConversationOverlay.tsx', 'utf8');

c = c.replace(/rgba\(96, 165, 250, 0\.45\)/g, 'rgba(255, 255, 255, 0.15)');
c = c.replace(/linear-gradient\(135deg, rgba\(59,130,246,0\.25\), rgba\(15,23,42,0\.30\)\)/g, 'linear-gradient(135deg, rgba(0,0,0,0.55), rgba(15,15,15,0.7))');

c = c.replace(/rgba\(56, 189, 248/g, 'rgba(255, 255, 255');
c = c.replace(/rgba\(14, 165, 233/g, 'rgba(200, 200, 200');

c = c.replace(/rgba\(191, 219, 254, 0\.95\)/g, 'rgba(255, 255, 255, 0.85)');
c = c.replace(/rgba\(239, 246, 255, 0\.98\)/g, 'rgba(255, 255, 255, 0.95)');
c = c.replace(/rgba\(191, 219, 254, 0\.9\)/g, 'rgba(255, 255, 255, 0.85)');

c = c.replace(/rgba\(52, 211, 153, 0\.45\)/g, 'rgba(255, 255, 255, 0.15)');
c = c.replace(/linear-gradient\(135deg, rgba\(16,185,129,0\.25\), rgba\(15,23,42,0\.30\)\)/g, 'linear-gradient(135deg, rgba(0,0,0,0.55), rgba(15,15,15,0.7))');

c = c.replace(/rgba\(167, 243, 208, 0\.95\)/g, 'rgba(255, 255, 255, 0.85)');
c = c.replace(/rgba\(240, 253, 250, 0\.98\)/g, 'rgba(255, 255, 255, 0.95)');
c = c.replace(/rgba\(167, 243, 208, 0\.9\)/g, 'rgba(255, 255, 255, 0.85)');

fs.writeFileSync('src/pages/videochat/components/AgentConversationOverlay.tsx', c);
