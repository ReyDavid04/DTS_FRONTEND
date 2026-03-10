// ==================== OBTENER IP ====================
const ip = ((window.location.href).split(`/`)[2]).split(`:`)[0];

// ==================== MODE ====================
const isUAT = false;

// ==================== ENVIRONMENT ====================
export const environment = {
    // ========= System environments ==================
    IP: ip,
    environmentName: 'development',
    ENCRYPTION_KEY: `yHojgZdVh9Q+al5UwAQxHTv0IFakDBQIVlIGvHPRrCc=`,
    production: false,
    mode: isUAT ? 'UAT' : 'PROD',
    BUSINESS_UNIT: "DT System",

    // ========= User environment ==================
    // userURL: "http://10.19.16.37:20024",
    userURL: "http://localhost:20024",
    
    // ========= DTS environment ==================
    // dtsURL: "http://10.19.16.37:20026",
    dtsURL: "http://localhost:20026",
};