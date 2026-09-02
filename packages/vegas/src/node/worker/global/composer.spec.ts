import { expect, test } from "vitest";

import { createLegacyUnsupportedGlobalSeed } from "./composer";

const EXPECTED_LEGACY_UNSUPPORTED_GLOBAL_NAMES = [
  "AdminDirectory",
  "AdminLicenseManager",
  "AdminGroupsMigration",
  "AdminGroupsSettings",
  "AdminReseller",
  "AdminReports",
  "CalendarApp",
  "Chat",
  "DocumentApp",
  "FormApp",
  "GmailApp",
  "SlidesApp",
  "WorkspaceEvents",
  "Classroom",
  "GroupsApp",
  "CloudIdentityGroups",
  "People",
  "Tasks",
  "AnalyticsData",
  "AnalyticsAdmin",
  "Maps",
  "LanguageApp",
  "VertexAI",
  "YouTube",
  "YouTubeAnalytics",
  "YouTubeContentId",
  "Adsense",
  "DisplayVideo",
  "DoubleClickBidManager",
  "DoubleClickCampaigns",
  "MerchantApiProducts",
  "ShoppingContent",
  "DataStudioApp",
  "TagManager",
  "BigQuery",
  "Jdbc",
  "LinearOptimizationService",
  "XmlService",
  "Charts",
  "ContentService",
  "MailApp",
  "Browser",
  "ScriptApp",
] as const;

test("creates the legacy unsupported global seed", () => {
  const seed = createLegacyUnsupportedGlobalSeed();

  expect(Object.keys(seed).sort()).toEqual([...EXPECTED_LEGACY_UNSUPPORTED_GLOBAL_NAMES].sort());

  for (const name of EXPECTED_LEGACY_UNSUPPORTED_GLOBAL_NAMES) {
    expect(Object.hasOwn(seed, name)).toBe(true);
    expect(seed[name]).toBeUndefined();
  }

  expect(Object.hasOwn(seed, "DriveApp")).toBe(false);
  expect(Object.hasOwn(seed, "PropertiesService")).toBe(false);
});
