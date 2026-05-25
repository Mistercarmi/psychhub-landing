import { describe, it, expect } from "vitest";
import { buildEml, renderTemplate } from "@/lib/outlook/eml-builder";

describe("buildEml", () => {
  it("génère un .eml RFC 5322 minimal", () => {
    const eml = buildEml({
      to: "patient@example.fr",
      from: "psy@example.fr",
      subject: "Test",
      bodyText: "Bonjour."
    });
    expect(eml).toContain("From: psy@example.fr");
    expect(eml).toContain("To: patient@example.fr");
    expect(eml).toContain("Subject: Test");
    expect(eml).toContain("MIME-Version: 1.0");
    expect(eml).toContain("X-Unsent: 1");
  });

  it("encode un sujet non-ASCII en RFC 2047", () => {
    const eml = buildEml({
      to: "a@b.fr",
      subject: "Séance — relance",
      bodyText: "hi"
    });
    expect(eml).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
  });

  it("neutralise les CRLF dans le champ `to` (anti-injection de headers)", () => {
    const eml = buildEml({
      to: "victim@example.fr\r\nBcc: leak@evil.com",
      subject: "Test",
      bodyText: "hi"
    });
    // Pas de "Bcc:" en tant que header (= début de ligne)
    expect(eml).not.toMatch(/^Bcc:/m);
    // Le CRLF est remplacé par un espace, le contenu suspect reste collé au header To
    expect(eml).toMatch(/^To: victim@example\.fr Bcc: leak@evil\.com$/m);
  });

  it("neutralise les CRLF dans le champ `from`", () => {
    const eml = buildEml({
      to: "a@b.fr",
      from: "psy@x.fr\r\nX-Spoof: yes",
      subject: "Test",
      bodyText: "hi"
    });
    expect(eml).not.toMatch(/^X-Spoof:/m);
    expect(eml).toMatch(/^From: psy@x\.fr X-Spoof: yes$/m);
  });

  it("neutralise les CRLF dans un sujet ASCII (cas oublié dans l'ancienne version)", () => {
    const eml = buildEml({
      to: "a@b.fr",
      subject: "Hello\r\nBcc: leak@evil.com",
      bodyText: "hi"
    });
    expect(eml).not.toMatch(/^Bcc:/m);
  });

  it("échappe les guillemets et CRLF dans le filename d'attachment", () => {
    const eml = buildEml({
      to: "a@b.fr",
      subject: "Test",
      bodyText: "hi",
      attachment: {
        filename: 'malicious".pdf\r\nX-Spoof: yes',
        contentBase64: "AAA="
      }
    });
    // Pas de header X-Spoof injecté
    expect(eml).not.toMatch(/^X-Spoof:/m);
    // Le guillemet est échappé et les CRLF remplacés par un espace dans le filename
    expect(eml).toMatch(/filename="malicious\\"\.pdf X-Spoof: yes"/);
  });
});

describe("renderTemplate", () => {
  it("remplace les placeholders {{var}}", () => {
    expect(renderTemplate("Bonjour {{prenom}}", { prenom: "Marie" })).toBe("Bonjour Marie");
  });

  it("renvoie une chaîne vide pour une variable manquante", () => {
    expect(renderTemplate("X {{absent}} Y", {})).toBe("X  Y");
  });

  it("coerce les nombres en chaînes", () => {
    expect(renderTemplate("Montant : {{m}} €", { m: 42 })).toBe("Montant : 42 €");
  });
});
