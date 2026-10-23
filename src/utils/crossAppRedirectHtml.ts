/**
 * Page HTML temporaire pour la redirection SSO inter-applications (< 50 lignes).
 */

export function generateSsoRedirectHtml(appLabel: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>O-Girador - Connexion sécurisée...</title>
  <style>
    body {
      margin: 0; background-color: #fdfaf2; color: #181716;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; text-align: center; padding: 24px; box-sizing: border-box;
    }
    .card {
      background: #fdfaf2; border: 2px solid #181716; border-radius: 8px;
      padding: 32px 24px; box-shadow: 4px 4px 0px 0px #181716; max-width: 380px; width: 100%;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid rgba(24, 23, 22, 0.15);
      border-top-color: #8b2a1a; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 10px 0; font-size: 1.15rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
    p { margin: 0; opacity: 0.75; font-size: 0.88rem; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Redirection vers ${appLabel}</h2>
    <p>Authentification sécurisée de votre session en cours...</p>
  </div>
</body>
</html>`;
}
