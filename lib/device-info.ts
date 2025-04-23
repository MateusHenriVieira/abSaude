/**
 * Tenta obter o endereço MAC do dispositivo usando vários métodos
 * Nota: Devido às restrições de segurança do navegador, nem sempre retornará o endereço MAC real
 */
export async function getDeviceMAC(): Promise<string> {
  try {
    // Tenta obter interfaces de rede se disponível
    if ('navigator' in window && 'mediaDevices' in navigator) {
      try {
        // Solicita permissões de rede
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Tenta obter interfaces de rede
        const interfaces = await (navigator as any).networkInformation?.getNetworkInterfaces?.();
        if (interfaces) {
          for (const networkInterface of interfaces) {
            if (networkInterface.mac) {
              return networkInterface.mac;
            }
          }
        }
      } catch (error) {
        console.warn('Não foi possível acessar interfaces de rede:', error);
      }
    }

    // Alternativa: Tenta obter impressão digital do dispositivo incluindo informações de hardware
    const deviceInfo = await getDeviceFingerprint();
    return deviceInfo.hardwareId;

  } catch (error) {
    console.error('Erro ao obter MAC do dispositivo:', error);
    return 'Desconhecido';
  }
}

// Adiciona definição de tipo para propriedades não padrão do Navigator
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  networkInformation?: {
    getNetworkInterfaces?: () => Promise<Array<{ mac: string }>>;
  };
}

// Estende NavigatorConstructor em vez de redeclarar navigator
declare global {
  interface NavigatorConstructor {
    prototype: ExtendedNavigator;
  }
}

/**
 * Cria uma impressão digital única baseada nas informações de hardware disponíveis
 */
async function getDeviceFingerprint(): Promise<{ hardwareId: string }> {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 1,
    typeof (navigator as ExtendedNavigator).deviceMemory !== 'undefined' 
      ? (navigator as ExtendedNavigator).deviceMemory 
      : 'unknown',
    screen.colorDepth,
    screen.width + 'x' + screen.height,
  ];

  // Adiciona impressão digital do canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = '#069';
    ctx.fillText('Hardware ID', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Hardware ID', 4, 17);
    
    components.push(canvas.toDataURL());
  }

  // Gera um hash a partir dos componentes
  const fingerprint = await generateHash(components.join('|||'));
  
  return {
    hardwareId: fingerprint
  };
}

/**
 * Gera um hash a partir da string de entrada
 */
async function generateHash(text: string): Promise<string> {
  try {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback simple hash function if crypto API is not available
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  } catch (error) {
    console.warn('Error generating hash, using fallback:', error);
    return Date.now().toString(16); // Last resort fallback
  }
}
