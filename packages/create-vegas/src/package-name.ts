import validateNpmPackageName from "validate-npm-package-name";

const INVALID_PACKAGE_NAME_MESSAGE = "Invalid package.json name";

export function validatePackageName(name: string | undefined): string | undefined {
  if (name === undefined) {
    return INVALID_PACKAGE_NAME_MESSAGE;
  }

  const result = validateNpmPackageName(name);

  return result.validForNewPackages ? undefined : INVALID_PACKAGE_NAME_MESSAGE;
}
