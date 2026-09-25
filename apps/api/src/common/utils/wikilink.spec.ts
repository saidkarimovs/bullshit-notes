import { describe, expect, it } from "vitest";
import { parseWikilinks } from "./wikilink";

describe("wikilink parser", () => {
  it("extracts a simple link", () => {
    expect(parseWikilinks("see [[Recon Playbook]] now")).toEqual([
      "Recon Playbook",
    ]);
  });

  it("uses the target, not the alias", () => {
    expect(parseWikilinks("[[Target|display alias]]")).toEqual(["Target"]);
  });

  it("dedupes repeated targets", () => {
    expect(parseWikilinks("[[A]] and [[A]] and [[B]]")).toEqual(["A", "B"]);
  });

  it("handles multiple links across lines", () => {
    const body = "one [[Alpha]]\ntwo [[Beta|b]]\nthree [[Gamma]]";
    expect(parseWikilinks(body)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("trims surrounding whitespace in targets", () => {
    expect(parseWikilinks("[[  Spaced Note  ]]")).toEqual(["Spaced Note"]);
  });

  it("returns nothing when there are no links", () => {
    expect(parseWikilinks("plain text with [single] brackets")).toEqual([]);
  });

  it("is resilient to being called repeatedly (global regex state)", () => {
    parseWikilinks("[[X]]");
    expect(parseWikilinks("[[Y]]")).toEqual(["Y"]);
  });
});
