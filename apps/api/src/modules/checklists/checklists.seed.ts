import { randomUUID } from "node:crypto";

export interface ChecklistItem {
  id: string;
  section: string;
  title: string;
  description: string;
  state: "todo" | "pass" | "fail" | "na";
  noteId?: string;
  updatedAt?: string;
}

export interface SeedTemplate {
  name: string;
  framework: string;
  description: string;
  items: ChecklistItem[];
}

function item(section: string, title: string, description = ""): ChecklistItem {
  return { id: randomUUID(), section, title, description, state: "todo" };
}

// OWASP WSTG v4.2 — a real subset spanning the standard categories.
const WSTG_ITEMS: ChecklistItem[] = [
  item("Information Gathering", "WSTG-INFO-01 Conduct Search Engine Discovery Reconnaissance"),
  item("Information Gathering", "WSTG-INFO-02 Fingerprint Web Server"),
  item("Information Gathering", "WSTG-INFO-03 Review Webserver Metafiles for Information Leakage"),
  item("Information Gathering", "WSTG-INFO-04 Enumerate Applications on Webserver"),
  item("Information Gathering", "WSTG-INFO-05 Review Webpage Content for Information Leakage"),
  item("Information Gathering", "WSTG-INFO-06 Identify Application Entry Points"),
  item("Information Gathering", "WSTG-INFO-07 Map Execution Paths Through Application"),
  item("Information Gathering", "WSTG-INFO-08 Fingerprint Web Application Framework"),
  item("Information Gathering", "WSTG-INFO-10 Map Application Architecture"),
  item("Configuration Management", "WSTG-CONF-01 Test Network Infrastructure Configuration"),
  item("Configuration Management", "WSTG-CONF-02 Test Application Platform Configuration"),
  item("Configuration Management", "WSTG-CONF-03 Test File Extensions Handling for Sensitive Information"),
  item("Configuration Management", "WSTG-CONF-05 Enumerate Infrastructure and Application Admin Interfaces"),
  item("Configuration Management", "WSTG-CONF-07 Test HTTP Strict Transport Security"),
  item("Identity Management", "WSTG-IDNT-02 Test User Registration Process"),
  item("Identity Management", "WSTG-IDNT-04 Test Account Enumeration and Guessable User Account"),
  item("Identity Management", "WSTG-IDNT-05 Test for Weak or Unenforced Username Policy"),
  item("Authentication", "WSTG-ATHN-01 Test for Credentials Transported over an Encrypted Channel"),
  item("Authentication", "WSTG-ATHN-02 Test for Default Credentials"),
  item("Authentication", "WSTG-ATHN-03 Test for Weak Lock Out Mechanism"),
  item("Authentication", "WSTG-ATHN-04 Test for Bypassing Authentication Schema"),
  item("Authentication", "WSTG-ATHN-07 Test for Weak Password Policy"),
  item("Authentication", "WSTG-ATHN-09 Test for Weak Password Change or Reset Functionalities"),
  item("Authorization", "WSTG-ATHZ-01 Test Directory Traversal File Include"),
  item("Authorization", "WSTG-ATHZ-02 Test for Bypassing Authorization Schema"),
  item("Authorization", "WSTG-ATHZ-03 Test for Privilege Escalation"),
  item("Authorization", "WSTG-ATHZ-04 Test for Insecure Direct Object References"),
  item("Session Management", "WSTG-SESS-01 Test for Session Management Schema"),
  item("Session Management", "WSTG-SESS-02 Test for Cookies Attributes"),
  item("Session Management", "WSTG-SESS-03 Test for Session Fixation"),
  item("Session Management", "WSTG-SESS-05 Test for Cross Site Request Forgery"),
  item("Session Management", "WSTG-SESS-06 Test for Logout Functionality"),
  item("Input Validation", "WSTG-INPV-01 Test for Reflected Cross Site Scripting"),
  item("Input Validation", "WSTG-INPV-02 Test for Stored Cross Site Scripting"),
  item("Input Validation", "WSTG-INPV-05 Test for SQL Injection"),
  item("Input Validation", "WSTG-INPV-11 Test for Code Injection"),
  item("Input Validation", "WSTG-INPV-12 Test for Command Injection"),
  item("Input Validation", "WSTG-INPV-18 Test for Server-side Request Forgery"),
  item("Error Handling", "WSTG-ERRH-01 Test for Improper Error Handling"),
  item("Cryptography", "WSTG-CRYP-01 Test for Weak Transport Layer Security"),
  item("Business Logic", "WSTG-BUSL-01 Test Business Logic Data Validation"),
  item("Client-side", "WSTG-CLNT-01 Test for DOM-Based Cross Site Scripting"),
];

// OWASP API Security Top 10 (2023).
const API_TOP10_ITEMS: ChecklistItem[] = [
  item("API Top 10", "API1:2023 Broken Object Level Authorization"),
  item("API Top 10", "API2:2023 Broken Authentication"),
  item("API Top 10", "API3:2023 Broken Object Property Level Authorization"),
  item("API Top 10", "API4:2023 Unrestricted Resource Consumption"),
  item("API Top 10", "API5:2023 Broken Function Level Authorization"),
  item("API Top 10", "API6:2023 Unrestricted Access to Sensitive Business Flows"),
  item("API Top 10", "API7:2023 Server Side Request Forgery"),
  item("API Top 10", "API8:2023 Security Misconfiguration"),
  item("API Top 10", "API9:2023 Improper Inventory Management"),
  item("API Top 10", "API10:2023 Unsafe Consumption of APIs"),
];

// OWASP MASVS — 20 representative mobile controls.
const MASVS_ITEMS: ChecklistItem[] = [
  item("MASVS-STORAGE", "MSTG-STORAGE-1 No sensitive data in unprotected local storage"),
  item("MASVS-STORAGE", "MSTG-STORAGE-2 No sensitive data written to application logs"),
  item("MASVS-STORAGE", "MSTG-STORAGE-3 No sensitive data shared with third parties"),
  item("MASVS-STORAGE", "MSTG-STORAGE-5 Keyboard cache disabled for sensitive input"),
  item("MASVS-CRYPTO", "MSTG-CRYPTO-1 No hardcoded cryptographic keys"),
  item("MASVS-CRYPTO", "MSTG-CRYPTO-2 Proven cryptographic primitives used"),
  item("MASVS-CRYPTO", "MSTG-CRYPTO-4 No deprecated cryptographic protocols"),
  item("MASVS-AUTH", "MSTG-AUTH-1 Remote endpoints require authentication"),
  item("MASVS-AUTH", "MSTG-AUTH-2 Stateful session management on the server"),
  item("MASVS-AUTH", "MSTG-AUTH-4 Logout invalidates the session server-side"),
  item("MASVS-NETWORK", "MSTG-NETWORK-1 TLS used for all network traffic"),
  item("MASVS-NETWORK", "MSTG-NETWORK-2 Valid X.509 certificate verification"),
  item("MASVS-NETWORK", "MSTG-NETWORK-3 Certificate/public-key pinning enforced"),
  item("MASVS-PLATFORM", "MSTG-PLATFORM-1 Minimal, justified platform permissions"),
  item("MASVS-PLATFORM", "MSTG-PLATFORM-2 Input from external sources validated"),
  item("MASVS-PLATFORM", "MSTG-PLATFORM-3 No sensitive data exposed via IPC"),
  item("MASVS-CODE", "MSTG-CODE-2 App is built in release mode without debug symbols"),
  item("MASVS-CODE", "MSTG-CODE-3 Debugging symbols removed from native binaries"),
  item("MASVS-CODE", "MSTG-CODE-5 All third-party components identified and current"),
  item("MASVS-RESILIENCE", "MSTG-RESILIENCE-1 App detects rooted/jailbroken devices"),
];

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "OWASP WSTG v4.2",
    framework: "OWASP-WSTG-4.2",
    description: "OWASP Web Security Testing Guide checklist (subset of v4.2).",
    items: WSTG_ITEMS,
  },
  {
    name: "OWASP API Security Top 10 (2023)",
    framework: "OWASP-API-2023",
    description: "The ten most critical API security risks.",
    items: API_TOP10_ITEMS,
  },
  {
    name: "OWASP MASVS",
    framework: "OWASP-MASVS",
    description: "Mobile Application Security Verification Standard controls.",
    items: MASVS_ITEMS,
  },
];

// A fresh copy of a template's items with new ids and reset state.
export function cloneItems(items: unknown): ChecklistItem[] {
  const arr = Array.isArray(items) ? (items as ChecklistItem[]) : [];
  return arr.map((it) => ({
    id: randomUUID(),
    section: it.section,
    title: it.title,
    description: it.description ?? "",
    state: "todo" as const,
  }));
}
