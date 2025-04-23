/**
 * Serviço para obter informações do endereço IP do dispositivo
 */

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
}

export async function getDeviceIP(): Promise<IpInfo> {
  try {
    // Tentativa 1: Usando ipify
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return { ip: data.ip };
    }

    // Tentativa 2: Usando ipapi
    const backupResponse = await fetch('https://ipapi.co/json/');
    if (backupResponse.ok) {
      const data = await backupResponse.json();
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        isp: data.org
      };
    }

    // Última tentativa: Usando api alternativa
    const lastResponse = await fetch('https://api64.ipify.org?format=json');
    if (lastResponse.ok) {
      const data = await lastResponse.json();
      return { ip: data.ip };
    }

    throw new Error('Não foi possível obter o IP');
  } catch (error) {
    console.error('Erro ao obter IP:', error);
    return { ip: 'Desconhecido' };
  }
}
