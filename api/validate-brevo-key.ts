export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-brevo-key, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiKey =
      (req.headers["x-brevo-key"] as string) ||
      req.body?.apiKey ||
      (req.query?.apiKey as string) ||
      process.env.BREVO_API_KEY ||
      process.env.SENDINBLUE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "Nenhuma chave da Brevo informada. Insira a chave nas configurações ou na variável BREVO_API_KEY."
      });
    }

    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey.trim(),
        Accept: "application/json"
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errMsg = data.message || `Erro da Brevo (HTTP ${response.status})`;
      if (errMsg.includes("unrecognised IP address")) {
        errMsg =
          "Bloqueio de IP na Brevo: Acesse Segurança no Brevo e desative 'IPs autorizados' para esta chave API.";
      }
      return res.status(response.status).json({
        success: false,
        error: errMsg
      });
    }

    return res.status(200).json({
      success: true,
      email: data.email,
      companyName: data.companyName,
      plan: data.plan?.[0]?.type || "Ativo",
      credits: data.plan?.[0]?.credits ?? null
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Erro ao conectar com os servidores da Brevo."
    });
  }
}
